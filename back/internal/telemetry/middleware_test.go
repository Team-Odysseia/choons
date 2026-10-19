package telemetry

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/posthog/posthog-go"

	"github.com/Team-Odysseia/choons/back/internal/httpx"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	m.Run()
}

type recorder struct {
	mu   sync.Mutex
	msgs []posthog.Message
}

func (r *recorder) Enqueue(m posthog.Message) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.msgs = append(r.msgs, m)
	return nil
}

func (r *recorder) exceptions() []posthog.Exception {
	var out []posthog.Exception
	for _, m := range r.msgs {
		if e, ok := m.(posthog.Exception); ok {
			out = append(out, e)
		}
	}
	return out
}

func (r *recorder) captures(event string) []posthog.Capture {
	var out []posthog.Capture
	for _, m := range r.msgs {
		if c, ok := m.(posthog.Capture); ok && c.Event == event {
			out = append(out, c)
		}
	}
	return out
}

func testRouter(rec *recorder, configure func(*Options)) *gin.Engine {
	opts := Options{Environment: "test", Slow: time.Hour}
	if rec != nil {
		opts.Client = rec
	}
	if configure != nil {
		configure(&opts)
	}
	r := gin.New()
	r.Use(Middleware(opts))
	r.GET("/ok", func(c *gin.Context) { c.Status(http.StatusOK) })
	r.GET("/boom/:id", func(c *gin.Context) {
		_ = c.Error(errors.New("db exploded"))
		c.AbortWithStatus(http.StatusInternalServerError)
	})
	r.GET("/panic", func(c *gin.Context) { panic("kaboom") })
	r.GET("/missing", func(c *gin.Context) {
		_ = c.Error(errors.New("Track not found"))
		c.AbortWithStatus(http.StatusNotFound)
	})
	r.GET("/unauthorized", func(c *gin.Context) { c.AbortWithStatus(http.StatusUnauthorized) })
	r.GET("/slow", func(c *gin.Context) {
		time.Sleep(5 * time.Millisecond)
		c.Status(http.StatusOK)
	})
	return r
}

func serve(r *gin.Engine, path string, headers map[string]string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	r.ServeHTTP(w, req)
	return w
}

func TestMiddlewareSetsRequestID(t *testing.T) {
	w := serve(testRouter(nil, nil), "/ok", nil)
	if w.Code != http.StatusOK || w.Header().Get(httpx.RequestIDHeader) == "" {
		t.Fatalf("got %d %v", w.Code, w.Header())
	}
}

func TestMiddlewareCapturesServerErrors(t *testing.T) {
	rec := &recorder{}
	w := serve(testRouter(rec, nil), "/boom/42", map[string]string{sessionHeader: "sess-1"})
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("status %d", w.Code)
	}
	exs := rec.exceptions()
	if len(exs) != 1 {
		t.Fatalf("want 1 exception, got %d (%v)", len(exs), rec.msgs)
	}
	ex := exs[0]
	item := ex.ExceptionList[0]
	if item.Type != "GET /boom/:id" || item.Value != "db exploded" {
		t.Fatalf("item %+v", item)
	}
	if ex.DistinctId != "anonymous" || ex.Properties["$session_id"] != "sess-1" ||
		ex.Properties["status"] != http.StatusInternalServerError || ex.Properties["route"] != "/boom/:id" ||
		ex.Properties["request_id"] != w.Header().Get(httpx.RequestIDHeader) || ex.Properties["environment"] != "test" {
		t.Fatalf("props %v distinct %q", ex.Properties, ex.DistinctId)
	}
}

func TestMiddlewareRecoversPanics(t *testing.T) {
	rec := &recorder{}
	w := serve(testRouter(rec, nil), "/panic", nil)
	if w.Code != http.StatusInternalServerError || w.Body.String() != `{"error":"Internal server error"}` {
		t.Fatalf("got %d %s", w.Code, w.Body.String())
	}
	exs := rec.exceptions()
	if len(exs) != 1 {
		t.Fatalf("want 1 exception, got %d", len(exs))
	}
	item := exs[0].ExceptionList[0]
	if item.Type != "panic" || item.Value != "kaboom" || item.Stacktrace == nil || len(item.Stacktrace.Frames) == 0 {
		t.Fatalf("item %+v", item)
	}
}

func TestMiddlewareRecoversPanicsWithoutClient(t *testing.T) {
	w := serve(testRouter(nil, nil), "/panic", nil)
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("status %d", w.Code)
	}
}

func TestMiddlewareCapturesClientErrors(t *testing.T) {
	rec := &recorder{}
	serve(testRouter(rec, nil), "/missing", nil)
	failed := rec.captures(EventRequestFailed)
	if len(failed) != 1 || failed[0].Properties["status"] != http.StatusNotFound || failed[0].Properties["error"] != "Track not found" {
		t.Fatalf("got %v", rec.msgs)
	}
	if len(rec.exceptions()) != 0 {
		t.Fatal("4xx must not become an exception")
	}
}

func TestMiddlewareIgnoresUnauthorizedAndUnmatched(t *testing.T) {
	rec := &recorder{}
	r := testRouter(rec, nil)
	serve(r, "/unauthorized", nil)
	serve(r, "/wp-admin", nil)
	if len(rec.msgs) != 0 {
		t.Fatalf("got %v", rec.msgs)
	}
}

func TestMiddlewareCapturesSlowRequests(t *testing.T) {
	rec := &recorder{}
	r := testRouter(rec, func(o *Options) { o.Slow = time.Millisecond })
	serve(r, "/slow", nil)
	slow := rec.captures(EventRequestSlow)
	if len(slow) != 1 || slow[0].Properties["route"] != "/slow" {
		t.Fatalf("got %v", rec.msgs)
	}
}

func TestMiddlewareSkipsSlowRoutes(t *testing.T) {
	rec := &recorder{}
	r := testRouter(rec, func(o *Options) {
		o.Slow = time.Millisecond
		o.SkipSlow = func(c *gin.Context) bool { return c.FullPath() == "/slow" }
	})
	serve(r, "/slow", nil)
	if len(rec.msgs) != 0 {
		t.Fatalf("got %v", rec.msgs)
	}
}

func TestMiddlewareIdentifiesUsers(t *testing.T) {
	rec := &recorder{}
	r := testRouter(rec, func(o *Options) {
		o.User = func(*gin.Context) (User, bool) { return User{ID: "user-1", Role: "ADMIN"}, true }
	})
	serve(r, "/missing", map[string]string{distinctHeader: "browser-id"})
	failed := rec.captures(EventRequestFailed)
	if len(failed) != 1 || failed[0].DistinctId != "user-1" || failed[0].Properties["user_role"] != "ADMIN" {
		t.Fatalf("got %v", rec.msgs)
	}
	if _, ok := failed[0].Properties["$process_person_profile"]; ok {
		t.Fatal("identified users must keep person profiles")
	}
}

func TestMiddlewareFallsBackToBrowserDistinctID(t *testing.T) {
	rec := &recorder{}
	serve(testRouter(rec, nil), "/missing", map[string]string{distinctHeader: "browser-id"})
	failed := rec.captures(EventRequestFailed)
	if len(failed) != 1 || failed[0].DistinctId != "browser-id" || failed[0].Properties["$process_person_profile"] != false {
		t.Fatalf("got %v", rec.msgs)
	}
}
