package handler

import (
	"net/http"
	"strings"
	"testing"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

func TestLoginLogoutMe(t *testing.T) {
	s := newServer(t)
	bob := s.login("bob", model.RoleListener)

	if bob.cookie.MaxAge != 259200 || !bob.cookie.HttpOnly || bob.cookie.Path != "/" || bob.cookie.SameSite != http.SameSiteLaxMode || bob.cookie.Secure {
		t.Fatalf("cookie %+v", bob.cookie)
	}
	me := bob.get("/auth/me").status(http.StatusOK).keys()
	if me["username"] != "bob" || me["role"] != "LISTENER" || sortedKeys(me) != "id,role,username" {
		t.Fatalf("me %v", me)
	}

	res := s.anon().json(http.MethodPost, "/auth/login", map[string]string{"username": "bob", "password": "password1"})
	if res.Code != 200 || res.Body.Len() != 0 {
		t.Fatalf("login must return 200 with empty body: %d %q", res.Code, res.Body.String())
	}

	s.anon().json(http.MethodPost, "/auth/login", map[string]string{"username": "bob", "password": "wrongpass"}).errorIs(401, "Invalid credentials")
	s.anon().json(http.MethodPost, "/auth/login", map[string]string{"username": "", "password": "password1"}).errorIs(400, "username must not be blank")
	s.anon().json(http.MethodPost, "/auth/login", map[string]string{"username": "bob", "password": "x"}).errorIs(400, "password size must be between 6 and 160")
	s.anon().raw(http.MethodPost, "/auth/login", "application/json", strings.NewReader("{")).errorIs(400, "Malformed request body")

	out := bob.json(http.MethodPost, "/auth/logout", nil).status(http.StatusNoContent)
	cleared := out.Result().Cookies()
	if len(cleared) != 1 || cleared[0].Name != "CHOONS_AUTH" || cleared[0].MaxAge >= 0 || cleared[0].Value != "" {
		t.Fatalf("logout cookie %+v", cleared)
	}

	bearer := s.anon()
	req := bearerRequest(bob)
	if res := bearer.do(req); res.Code != 200 {
		t.Fatalf("bearer auth: %d", res.Code)
	}
}

func bearerRequest(sess *session) *http.Request {
	req, _ := http.NewRequest(http.MethodGet, "/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+sess.cookie.Value)
	return req
}

func TestRegister(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	created := admin.json(http.MethodPost, "/auth/register", map[string]string{"username": "  newbie ", "password": "secret1"}).status(http.StatusCreated).keys()
	if created["username"] != "newbie" || created["role"] != "LISTENER" {
		t.Fatalf("%v", created)
	}
	admin.json(http.MethodPost, "/auth/register", map[string]string{"username": "newbie", "password": "secret1"}).errorIs(409, "Username already exists")
	s.anon().json(http.MethodPost, "/auth/login", map[string]string{"username": "newbie", "password": "secret1"}).status(200)
}
