package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

const (
	javaSecret   = "0123456789abcdef0123456789abcdef0123"
	javaToken    = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMTkyZDZhMC0wMDAwLTcwMDAtODAwMC0wMDAwMDAwMDAwMDEiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3OTIzNTYwOTksImV4cCI6MTc5MjYxNTI5OX0.cNBy7pTOJ8nTQQ_YsJpyoPfL6P5CuMoafBns9XVJYVM"
	javaTokenSub = "0192d6a0-0000-7000-8000-000000000001"
	springHash   = "$2a$10$2SMB8ia1yqQy2SnNFKDUseixVgQEK2E/8gXhYKLSaF3.HT6YDwdUK"
)

func init() { gin.SetMode(gin.TestMode) }

func newTokens(t *testing.T, secret string, now time.Time) *Tokens {
	t.Helper()
	tk, err := NewTokens([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	tk.now = func() time.Time { return now }
	return tk
}

func TestParsesTokenIssuedByJavaBackend(t *testing.T) {
	tk := newTokens(t, javaSecret, time.Unix(1792356200, 0))
	id, err := tk.Parse(javaToken)
	if err != nil {
		t.Fatal(err)
	}
	if id.String() != javaTokenSub {
		t.Fatalf("sub = %s", id)
	}
}

func TestRejectsExpiredJavaToken(t *testing.T) {
	tk := newTokens(t, javaSecret, time.Unix(1792615299+60, 0))
	if _, err := tk.Parse(javaToken); err == nil {
		t.Fatal("expected expiry error")
	}
}

func TestRejectsTokenSignedWithOtherSecret(t *testing.T) {
	tk := newTokens(t, "another-secret-another-secret-another", time.Unix(1792356200, 0))
	if _, err := tk.Parse(javaToken); err == nil {
		t.Fatal("expected signature error")
	}
}

func TestRejectsUnsignedToken(t *testing.T) {
	parts := strings.Split(javaToken, ".")
	none := "eyJhbGciOiJub25lIn0." + parts[1] + "."
	tk := newTokens(t, javaSecret, time.Unix(1792356200, 0))
	if _, err := tk.Parse(none); err == nil {
		t.Fatal("expected alg none to be rejected")
	}
}

func TestIssueRoundTripAndAlgorithmByKeyLength(t *testing.T) {
	cases := map[int]string{32: "HS256", 48: "HS384", 64: "HS512"}
	for n, alg := range cases {
		secret := strings.Repeat("k", n)
		tk := newTokens(t, secret, time.Now())
		if tk.method.Alg() != alg {
			t.Fatalf("len %d: alg %s want %s", n, tk.method.Alg(), alg)
		}
		u := &model.User{Base: model.Base{ID: uuid.New()}, Role: model.RoleListener}
		tok, err := tk.Issue(u)
		if err != nil {
			t.Fatal(err)
		}
		id, err := tk.Parse(tok)
		if err != nil || id != u.ID {
			t.Fatalf("round trip: %v %v", id, err)
		}
	}
}

func TestNewTokensRejectsShortSecret(t *testing.T) {
	if _, err := NewTokens([]byte("short")); err == nil {
		t.Fatal("expected error")
	}
}

func TestCheckPasswordAcceptsSpringBCryptHash(t *testing.T) {
	if !CheckPassword(springHash, "listenerpass") {
		t.Fatal("spring hash should verify")
	}
	if CheckPassword(springHash, "wrong") {
		t.Fatal("wrong password accepted")
	}
	if CheckPassword("", "anything") {
		t.Fatal("empty hash accepted")
	}
}

func TestHashPasswordUsesCost10(t *testing.T) {
	h, err := HashPassword("secret123")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(h, "$2a$10$") || !CheckPassword(h, "secret123") {
		t.Fatalf("unexpected hash %q", h)
	}
}

func router(tk *Tokens, users map[uuid.UUID]*model.User) *gin.Engine {
	load := func(_ context.Context, id uuid.UUID) (*model.User, error) {
		u, ok := users[id]
		if !ok {
			return nil, errors.New("not found")
		}
		return u, nil
	}
	r := gin.New()
	r.Use(Authenticate(tk, Cookie{Name: "CHOONS_AUTH"}, load))
	r.GET("/me", RequireUser(), func(c *gin.Context) { c.String(http.StatusOK, CurrentUser(c).Username) })
	r.GET("/admin", RequireRole(model.RoleAdmin), func(c *gin.Context) { c.Status(http.StatusOK) })
	return r
}

func TestMiddlewareTokenSources(t *testing.T) {
	tk := newTokens(t, javaSecret, time.Now())
	admin := &model.User{Base: model.Base{ID: uuid.New()}, Username: "admin", Role: model.RoleAdmin}
	listener := &model.User{Base: model.Base{ID: uuid.New()}, Username: "bob", Role: model.RoleListener}
	ghost := &model.User{Base: model.Base{ID: uuid.New()}, Role: model.RoleAdmin}
	r := router(tk, map[uuid.UUID]*model.User{admin.ID: admin, listener.ID: listener})
	adminTok, _ := tk.Issue(admin)
	listenerTok, _ := tk.Issue(listener)
	ghostTok, _ := tk.Issue(ghost)

	cases := []struct {
		name   string
		path   string
		setup  func(*http.Request)
		status int
		body   string
	}{
		{"no token", "/me", func(*http.Request) {}, 401, ""},
		{"bearer", "/me", func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+listenerTok) }, 200, "bob"},
		{"cookie", "/me", func(r *http.Request) { r.AddCookie(&http.Cookie{Name: "CHOONS_AUTH", Value: listenerTok}) }, 200, "bob"},
		{"bearer wins over cookie", "/me", func(r *http.Request) {
			r.Header.Set("Authorization", "Bearer "+adminTok)
			r.AddCookie(&http.Cookie{Name: "CHOONS_AUTH", Value: listenerTok})
		}, 200, "admin"},
		{"query token ignored", "/me?token=" + listenerTok, func(*http.Request) {}, 401, ""},
		{"garbage token", "/me", func(r *http.Request) { r.Header.Set("Authorization", "Bearer nope") }, 401, ""},
		{"deleted user", "/me", func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+ghostTok) }, 401, ""},
		{"admin ok", "/admin", func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+adminTok) }, 200, ""},
		{"listener forbidden", "/admin", func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+listenerTok) }, 403, `{"error":"Access Denied"}`},
		{"anonymous admin", "/admin", func(*http.Request) {}, 401, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			tc.setup(req)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tc.status {
				t.Fatalf("status %d want %d", w.Code, tc.status)
			}
			if w.Body.String() != tc.body {
				t.Fatalf("body %q want %q", w.Body.String(), tc.body)
			}
		})
	}
}

func TestCookieAttributes(t *testing.T) {
	cases := []struct {
		secure bool
		want   []string
	}{
		{false, []string{"CHOONS_AUTH=tok", "Path=/", "Max-Age=259200", "HttpOnly", "SameSite=Lax"}},
		{true, []string{"CHOONS_AUTH=tok", "Path=/", "Max-Age=259200", "HttpOnly", "Secure", "SameSite=None"}},
	}
	for _, tc := range cases {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		Cookie{Name: "CHOONS_AUTH", Secure: tc.secure}.Set(c, "tok", 259200)
		got := w.Header().Get("Set-Cookie")
		for _, part := range tc.want {
			if !strings.Contains(got, part) {
				t.Errorf("secure=%v cookie %q missing %q", tc.secure, got, part)
			}
		}
		if !tc.secure && strings.Contains(got, "Secure") {
			t.Errorf("insecure cookie has Secure: %q", got)
		}
	}
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	Cookie{Name: "CHOONS_AUTH"}.Clear(c)
	if got := w.Header().Get("Set-Cookie"); !strings.Contains(got, "Max-Age=0") || !strings.HasPrefix(got, "CHOONS_AUTH=;") {
		t.Fatalf("clear cookie %q", got)
	}
}
