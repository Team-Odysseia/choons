package handler

import (
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/posthog/posthog-go"

	"github.com/Team-Odysseia/choons/back/internal/httpx"
	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/telemetry"
)

type eventRecorder struct {
	mu   sync.Mutex
	msgs []posthog.Message
}

func (r *eventRecorder) Enqueue(m posthog.Message) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.msgs = append(r.msgs, m)
	return nil
}

func (r *eventRecorder) captures(event string) []posthog.Capture {
	r.mu.Lock()
	defer r.mu.Unlock()
	var out []posthog.Capture
	for _, m := range r.msgs {
		if c, ok := m.(posthog.Capture); ok && c.Event == event {
			out = append(out, c)
		}
	}
	return out
}

func TestRouterReportsFailedRequestsForUser(t *testing.T) {
	events := &eventRecorder{}
	s := newServer(t, opts{loginPerMin: 1000, streamPerMin: 1000, heartbeat: time.Hour, sseTimeout: time.Minute, events: events})
	bob := s.login("bob", model.RoleListener)

	res := bob.get("/music/tracks/" + uuid.NewString()).status(http.StatusNotFound)
	if res.Header().Get(httpx.RequestIDHeader) == "" {
		t.Fatal("missing request id header")
	}

	failed := events.captures(telemetry.EventRequestFailed)
	if len(failed) != 1 {
		t.Fatalf("want 1 failed request, got %d", len(failed))
	}
	props := failed[0].Properties
	if failed[0].DistinctId != bob.user.ID.String() || props["route"] != "/music/tracks/:id" || props["user_role"] != string(model.RoleListener) {
		t.Fatalf("got %q %v", failed[0].DistinctId, props)
	}
}

func TestSlowExempt(t *testing.T) {
	cases := []struct {
		method, route string
		want          bool
	}{
		{http.MethodGet, "/healthz", true},
		{http.MethodGet, "/parties/:code/events", true},
		{http.MethodPost, "/admin/tracks", true},
		{http.MethodPost, "/admin/tracks/batch", true},
		{http.MethodGet, "/music/tracks/:id", false},
		{http.MethodGet, "/admin/tracks", false},
	}
	for _, tc := range cases {
		if got := slowExempt(tc.method, tc.route); got != tc.want {
			t.Errorf("%s %s: got %v want %v", tc.method, tc.route, got, tc.want)
		}
	}
}
