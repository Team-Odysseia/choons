package httpx

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	if err := RegisterValidators(); err != nil {
		panic(err)
	}
	m.Run()
}

type loginReq struct {
	Username string `json:"username" binding:"notblank,size=0_80"`
	Password string `json:"password" binding:"notblank,size=6_160"`
}

type submitReq struct {
	ExternalURL string     `json:"externalUrl" binding:"notblank,size=0_600,httpurl"`
	TrackID     *uuid.UUID `json:"trackId" binding:"required"`
	IDs         []string   `json:"ids" binding:"required,notempty"`
	Position    float64    `json:"positionSec" binding:"gte=0"`
	Policy      string     `json:"queuePolicy" binding:"required,oneof=DJ_ONLY EVERYONE"`
}

func bindStatus(t *testing.T, dst any, body string) (int, string) {
	t.Helper()
	r := gin.New()
	r.POST("/", func(c *gin.Context) {
		if BindJSON(c, dst) {
			c.Status(http.StatusNoContent)
		}
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body)))
	return w.Code, w.Body.String()
}

func TestValidationMessagesMatchSpring(t *testing.T) {
	valid := `"externalUrl":"https://x.y","trackId":"0192d6a0-0000-7000-8000-000000000001","ids":["a"],"positionSec":1,"queuePolicy":"EVERYONE"`
	cases := []struct {
		name string
		dst  any
		body string
		want string
	}{
		{"blank username", &loginReq{}, `{"username":"  ","password":"secret1"}`, "username must not be blank"},
		{"long username", &loginReq{}, `{"username":"` + strings.Repeat("a", 81) + `","password":"secret1"}`, "username size must be between 0 and 80"},
		{"short password", &loginReq{}, `{"username":"bob","password":"x"}`, "password size must be between 6 and 160"},
		{"bad url", &submitReq{}, `{` + strings.Replace(valid, "https://x.y", "ftp://x", 1) + `}`, "externalUrl externalUrl must be a valid http/https URL"},
		{"null uuid", &submitReq{}, `{` + strings.Replace(valid, `"trackId":"0192d6a0-0000-7000-8000-000000000001"`, `"trackId":null`, 1) + `}`, "trackId must not be null"},
		{"empty list", &submitReq{}, `{` + strings.Replace(valid, `["a"]`, `[]`, 1) + `}`, "ids must not be empty"},
		{"null list", &submitReq{}, `{` + strings.Replace(valid, `"ids":["a"],`, ``, 1) + `}`, "ids must not be null"},
		{"negative", &submitReq{}, `{` + strings.Replace(valid, `"positionSec":1`, `"positionSec":-1`, 1) + `}`, "positionSec must be greater than or equal to 0"},
		{"bad enum", &submitReq{}, `{` + strings.Replace(valid, "EVERYONE", "NOPE", 1) + `}`, "queuePolicy must be one of [DJ_ONLY, EVERYONE]"},
		{"malformed json", &loginReq{}, `{"username":`, "Malformed request body"},
		{"bad uuid", &submitReq{}, `{` + strings.Replace(valid, "0192d6a0-0000-7000-8000-000000000001", "nope", 1) + `}`, "Malformed request body"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			code, body := bindStatus(t, tc.dst, tc.body)
			if code != http.StatusBadRequest {
				t.Fatalf("status %d body %s", code, body)
			}
			if want := fmt.Sprintf(`{"error":%q}`, tc.want); body != want {
				t.Fatalf("body %s want %s", body, want)
			}
		})
	}
	if code, body := bindStatus(t, &submitReq{}, `{`+valid+`}`); code != http.StatusNoContent {
		t.Fatalf("valid body rejected: %d %s", code, body)
	}
}

func TestFailMapping(t *testing.T) {
	cases := []struct {
		err    error
		status int
		body   string
	}{
		{apperr.NotFound("Track not found: %s", "x"), 404, `{"error":"Track not found: x"}`},
		{apperr.AccessDenied, 403, `{"error":"Access denied"}`},
		{apperr.Conflict("Username already exists"), 409, `{"error":"Username already exists"}`},
		{fmt.Errorf("wrap: %w", apperr.BadRequest("bad")), 400, `{"error":"bad"}`},
		{gorm.ErrDuplicatedKey, 409, `{"error":"Conflict with existing data"}`},
		{gorm.ErrForeignKeyViolated, 409, `{"error":"Conflict with existing data"}`},
		{errors.New("boom"), 500, `{"error":"Internal server error"}`},
	}
	for _, tc := range cases {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
		Fail(c, tc.err)
		if w.Code != tc.status || w.Body.String() != tc.body {
			t.Errorf("%v: got %d %s", tc.err, w.Code, w.Body.String())
		}
		if last := c.Errors.Last(); last == nil || !errors.Is(last.Err, tc.err) {
			t.Errorf("%v: not recorded on context, got %v", tc.err, c.Errors)
		}
	}
}

func corsRouter() *gin.Engine {
	r := gin.New()
	r.Use(CORS([]string{"http://localhost:5173"}))
	r.GET("/x", func(c *gin.Context) { c.Status(http.StatusOK) })
	return r
}

func TestCORS(t *testing.T) {
	r := corsRouter()

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/x", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	req.Header.Set("Access-Control-Request-Method", "PUT")
	req.Header.Set("Access-Control-Request-Headers", "content-type")
	r.ServeHTTP(w, req)
	h := w.Header()
	if w.Code != 200 || h.Get("Access-Control-Allow-Origin") != "http://localhost:5173" ||
		h.Get("Access-Control-Allow-Credentials") != "true" || h.Get("Access-Control-Allow-Methods") != allowedMethods ||
		h.Get("Access-Control-Allow-Headers") != "content-type" || h.Get("Access-Control-Max-Age") != "600" {
		t.Fatalf("preflight: %d %v", w.Code, h)
	}

	w = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodOptions, "/x", nil)
	req.Header.Set("Origin", "https://evil.example")
	req.Header.Set("Access-Control-Request-Method", "GET")
	r.ServeHTTP(w, req)
	if w.Code != 403 || w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("foreign preflight: %d %v", w.Code, w.Header())
	}

	w = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Origin", "https://evil.example")
	r.ServeHTTP(w, req)
	if w.Code != 200 || w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("foreign simple: %d %v", w.Code, w.Header())
	}

	w = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	r.ServeHTTP(w, req)
	if w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:5173" ||
		w.Header().Get("Access-Control-Expose-Headers") != "X-Request-ID" {
		t.Fatalf("allowed simple: %v", w.Header())
	}
}

func TestRateLimiterBucket(t *testing.T) {
	now := time.Unix(0, 0)
	rl := NewRateLimiter(3)
	rl.now = func() time.Time { return now }
	for i := range 3 {
		if !rl.Allow("ip") {
			t.Fatalf("request %d blocked", i)
		}
	}
	if rl.Allow("ip") {
		t.Fatal("4th request allowed")
	}
	if !rl.Allow("other") {
		t.Fatal("other key blocked")
	}
	now = now.Add(20 * time.Second)
	if !rl.Allow("ip") {
		t.Fatal("token not refilled after 20s at 3/min")
	}
	now = now.Add(limiterIdleTTL + time.Second)
	rl.evict()
	if len(rl.visitors) != 0 {
		t.Fatalf("visitors not evicted: %d", len(rl.visitors))
	}
}

func TestRateLimitMiddlewareWithCORS(t *testing.T) {
	rl := NewRateLimiter(1)
	r := gin.New()
	r.Use(CORS([]string{"http://localhost:5173"}))
	r.GET("/stream/x", rl.Middleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
	do := func(method string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(method, "/stream/x", nil)
		req.Header.Set("Origin", "http://localhost:5173")
		if method == http.MethodOptions {
			req.Header.Set("Access-Control-Request-Method", "GET")
		}
		r.ServeHTTP(w, req)
		return w
	}
	if w := do(http.MethodOptions); w.Code != 200 {
		t.Fatalf("preflight %d", w.Code)
	}
	if w := do(http.MethodGet); w.Code != 200 {
		t.Fatalf("first GET %d (preflight must not consume tokens)", w.Code)
	}
	w := do(http.MethodGet)
	if w.Code != 429 || w.Header().Get("Retry-After") != "60" || w.Body.String() != `{"error":"Too many requests"}` {
		t.Fatalf("limited: %d %v %s", w.Code, w.Header(), w.Body.String())
	}
	if w.Header().Get("Access-Control-Allow-Origin") == "" {
		t.Fatal("429 lacks CORS headers")
	}
}

func TestPathUUID(t *testing.T) {
	r := gin.New()
	r.GET("/t/:id", func(c *gin.Context) {
		if id, ok := PathUUID(c, "id"); ok {
			c.String(http.StatusOK, id.String())
		}
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/t/nope", nil))
	if w.Code != 400 || w.Body.String() != `{"error":"Invalid id"}` {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}
