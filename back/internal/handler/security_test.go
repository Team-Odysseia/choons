package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

func TestRouteGuards(t *testing.T) {
	s := newServer(t)
	anon := s.anon()
	listener := s.login("bob", model.RoleListener)
	admin := s.login("root", model.RoleAdmin)

	protected := []struct{ method, path string }{
		{"GET", "/auth/me"}, {"GET", "/music/artists"}, {"GET", "/music/tracks/most-played"},
		{"GET", "/stream/0192d6a0-0000-7000-8000-000000000001"}, {"POST", "/stream/0192d6a0-0000-7000-8000-000000000001/played"},
		{"GET", "/playlists"}, {"GET", "/favorites"}, {"GET", "/parties/me"},
		{"GET", "/media/images/artists/0192d6a0-0000-7000-8000-000000000001"},
		{"GET", "/album-requests/mine"}, {"GET", "/admin/listeners"}, {"POST", "/auth/register"},
		{"GET", "/does-not-exist"},
	}
	for _, r := range protected {
		res := anon.json(r.method, r.path, nil)
		if res.Code != http.StatusUnauthorized || res.Body.Len() != 0 {
			t.Errorf("anon %s %s: %d %q (want 401 empty)", r.method, r.path, res.Code, res.Body.String())
		}
	}

	public := []string{"/public/covers", "/healthz"}
	for _, p := range public {
		if res := anon.get(p); res.Code != http.StatusOK {
			t.Errorf("anon GET %s: %d", p, res.Code)
		}
	}
	if res := anon.get("/media/images/albums/0192d6a0-0000-7000-8000-000000000001"); res.Code != http.StatusNotFound {
		t.Errorf("album images are public (404 for unknown, not 401): %d", res.Code)
	}

	for _, p := range []string{"/admin/listeners", "/admin/artists", "/admin/album-requests"} {
		listener.get(p).errorIs(http.StatusForbidden, "Access Denied")
		admin.get(p).status(http.StatusOK)
	}
	listener.json(http.MethodPost, "/auth/register", map[string]string{"username": "x", "password": "secret1"}).errorIs(http.StatusForbidden, "Access Denied")
	admin.get("/album-requests/mine").errorIs(http.StatusForbidden, "Access Denied")
	listener.get("/album-requests/mine").status(http.StatusOK)

	listener.get("/does-not-exist").errorIs(http.StatusNotFound, "Not found")
	listener.get("/music/artists/not-a-uuid").errorIs(http.StatusBadRequest, "Invalid id")
}

func TestCORSOnRealRouter(t *testing.T) {
	s := newServer(t, opts{loginPerMin: 1, streamPerMin: 1000, heartbeat: 1 << 40, sseTimeout: 1 << 40})
	req := httptest.NewRequest(http.MethodOptions, "/auth/login", nil)
	req.Header.Set("Origin", testOrigin)
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "content-type")
	res := s.anon().do(req)
	if res.Code != 200 || res.Header().Get("Access-Control-Allow-Origin") != testOrigin || res.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatalf("preflight %d %v", res.Code, res.Header())
	}

	login := func() *response {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{"username":"nobody","password":"whatever"}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", testOrigin)
		return s.anon().do(req)
	}
	login().errorIs(http.StatusUnauthorized, "Invalid credentials")
	limited := login()
	limited.errorIs(http.StatusTooManyRequests, "Too many requests")
	if limited.Header().Get("Retry-After") != "60" || limited.Header().Get("Access-Control-Allow-Origin") != testOrigin {
		t.Fatalf("429 headers %v", limited.Header())
	}
}

func TestStreamRateLimitCoversPlayed(t *testing.T) {
	s := newServer(t, opts{loginPerMin: 1000, streamPerMin: 2, heartbeat: 1 << 40, sseTimeout: 1 << 40})
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)
	admin.get("/stream/" + ids.track).status(http.StatusFound)
	admin.json(http.MethodPost, "/stream/"+ids.track+"/played", nil).status(http.StatusNoContent)
	admin.get("/stream/"+ids.track).errorIs(http.StatusTooManyRequests, "Too many requests")
	admin.get("/music/tracks/" + ids.track).status(http.StatusOK)
}
