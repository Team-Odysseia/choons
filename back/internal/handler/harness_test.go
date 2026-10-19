package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Team-Odysseia/choons/back/internal/auth"
	"github.com/Team-Odysseia/choons/back/internal/httpx"
	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/party"
	"github.com/Team-Odysseia/choons/back/internal/service"
	"github.com/Team-Odysseia/choons/back/internal/storage"
	"github.com/Team-Odysseia/choons/back/internal/testutil/pgtest"
)

const testOrigin = "http://localhost:5173"

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	if err := httpx.RegisterValidators(); err != nil {
		panic(err)
	}
	m.Run()
}

type server struct {
	t       *testing.T
	closing chan struct{}
	h       *Handler
	router  *gin.Engine
	store   *storage.Fake
	ctx     context.Context
}

type opts struct {
	loginPerMin  int
	streamPerMin int
	heartbeat    time.Duration
	sseTimeout   time.Duration
}

func newServer(t *testing.T, o ...opts) *server {
	t.Helper()
	cfg := opts{loginPerMin: 1000, streamPerMin: 1000, heartbeat: time.Hour, sseTimeout: time.Minute}
	if len(o) > 0 {
		cfg = o[0]
	}
	gdb := pgtest.NewDB(t)
	store := storage.NewFake()
	tokens, err := auth.NewTokens([]byte("test-secret-test-secret-test-secret!"))
	if err != nil {
		t.Fatal(err)
	}
	hub := party.NewHub()
	closing := make(chan struct{})
	catalog := service.NewCatalog(gdb, store, nil)
	catalog.SetAsync(func(f func()) { f() })
	h := &Handler{
		DB: gdb, Users: service.NewUsers(gdb), Catalog: catalog, Library: service.NewLibrary(gdb),
		Playlists: service.NewPlaylists(gdb), Parties: service.NewParties(gdb, hub), Hub: hub, Store: store,
		Tokens: tokens, Cookie: auth.Cookie{Name: "CHOONS_AUTH"},
		StreamTTL: 6 * time.Hour, ImageTTL: time.Hour, SSETimeout: cfg.sseTimeout, Heartbeat: cfg.heartbeat, Closing: closing,
	}
	r, err := h.Router(RouterConfig{
		CORSOrigins:   []string{testOrigin},
		LoginLimiter:  httpx.NewRateLimiter(cfg.loginPerMin),
		StreamLimiter: httpx.NewRateLimiter(cfg.streamPerMin),
	})
	if err != nil {
		t.Fatal(err)
	}
	return &server{t: t, closing: closing, h: h, router: r, store: store, ctx: context.Background()}
}

func (s *server) close() { close(s.closing) }

type session struct {
	s      *server
	cookie *http.Cookie
	user   *model.User
}

func (s *server) anon() *session { return &session{s: s} }

func (s *server) login(username string, role model.Role) *session {
	s.t.Helper()
	if _, err := s.h.Users.Register(s.ctx, username, "password1", role); err != nil {
		s.t.Fatal(err)
	}
	sess := s.anon()
	res := sess.json(http.MethodPost, "/auth/login", map[string]string{"username": username, "password": "password1"})
	res.status(http.StatusOK)
	for _, ck := range res.Result().Cookies() {
		if ck.Name == "CHOONS_AUTH" {
			sess.cookie = ck
		}
	}
	if sess.cookie == nil {
		s.t.Fatal("no auth cookie")
	}
	u, err := s.h.Users.Authenticate(s.ctx, username, "password1")
	if err != nil {
		s.t.Fatal(err)
	}
	sess.user = u
	return sess
}

type response struct {
	*httptest.ResponseRecorder
	t *testing.T
}

func (r *response) status(want int) *response {
	r.t.Helper()
	if r.Code != want {
		r.t.Fatalf("status %d want %d, body %s", r.Code, want, r.Body.String())
	}
	return r
}

func (r *response) errorIs(status int, msg string) {
	r.t.Helper()
	r.status(status)
	var body httpx.ErrorBody
	if err := json.Unmarshal(r.Body.Bytes(), &body); err != nil || body.Error != msg {
		r.t.Fatalf("error body %s want %q", r.Body.String(), msg)
	}
}

func (r *response) decode(dst any) *response {
	r.t.Helper()
	if err := json.Unmarshal(r.Body.Bytes(), dst); err != nil {
		r.t.Fatalf("decode %s: %v", r.Body.String(), err)
	}
	return r
}

func (r *response) keys() map[string]any {
	r.t.Helper()
	var m map[string]any
	r.decode(&m)
	return m
}

func (sess *session) do(req *http.Request) *response {
	if sess.cookie != nil {
		req.AddCookie(sess.cookie)
	}
	w := httptest.NewRecorder()
	sess.s.router.ServeHTTP(w, req)
	return &response{ResponseRecorder: w, t: sess.s.t}
}

func (sess *session) raw(method, path, contentType string, body io.Reader) *response {
	req := httptest.NewRequest(method, path, body)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	return sess.do(req)
}

func (sess *session) json(method, path string, body any) *response {
	if body == nil {
		return sess.raw(method, path, "", nil)
	}
	data, err := json.Marshal(body)
	if err != nil {
		sess.s.t.Fatal(err)
	}
	return sess.raw(method, path, "application/json", bytes.NewReader(data))
}

func (sess *session) get(path string) *response { return sess.json(http.MethodGet, path, nil) }

type part struct {
	field, filename, contentType string
	data                         []byte
}

func filePart(field, contentType string, data []byte) part {
	return part{field: field, filename: field + ".bin", contentType: contentType, data: data}
}

func field(name, value string) part { return part{field: name, data: []byte(value)} }

func (sess *session) multipart(method, path string, parts ...part) *response {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for _, p := range parts {
		if p.filename == "" {
			if err := mw.WriteField(p.field, string(p.data)); err != nil {
				sess.s.t.Fatal(err)
			}
			continue
		}
		hdr := textproto.MIMEHeader{}
		hdr.Set("Content-Disposition", `form-data; name="`+p.field+`"; filename="`+p.filename+`"`)
		hdr.Set("Content-Type", p.contentType)
		w, err := mw.CreatePart(hdr)
		if err != nil {
			sess.s.t.Fatal(err)
		}
		_, _ = w.Write(p.data)
	}
	_ = mw.Close()
	return sess.raw(method, path, mw.FormDataContentType(), &buf)
}

var (
	flac = append([]byte("fLaC"), make([]byte, 60)...)
	mp3  = append([]byte("ID3\x04"), make([]byte, 60)...)
	png  = append([]byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}, make([]byte, 24)...)
)

type catalogIDs struct {
	artist, album, track string
}

func (s *server) seedCatalog(admin *session) catalogIDs {
	s.t.Helper()
	var artist, album, track map[string]any
	admin.multipart(http.MethodPost, "/admin/artists", field("name", "Burial"), field("bio", "London"), filePart("avatarFile", "image/png", png)).
		status(http.StatusCreated).decode(&artist)
	admin.multipart(http.MethodPost, "/admin/albums", field("title", "Untrue"), field("artistId", artist["id"].(string)),
		field("releaseYear", "2007"), filePart("coverFile", "image/png", png)).status(http.StatusCreated).decode(&album)
	admin.multipart(http.MethodPost, "/admin/tracks", field("title", "Archangel"), field("albumId", album["id"].(string)),
		field("artistId", artist["id"].(string)), field("trackNumber", "2"), field("durationSeconds", "238"),
		filePart("audioFile", "audio/flac", flac)).status(http.StatusCreated).decode(&track)
	return catalogIDs{artist: artist["id"].(string), album: album["id"].(string), track: track["id"].(string)}
}

func sortedKeys(m map[string]any) string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	for i := range keys {
		for j := i + 1; j < len(keys); j++ {
			if keys[j] < keys[i] {
				keys[i], keys[j] = keys[j], keys[i]
			}
		}
	}
	return strings.Join(keys, ",")
}
