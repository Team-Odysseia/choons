package handler

import (
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
	"github.com/Team-Odysseia/choons/back/internal/auth"
	"github.com/Team-Odysseia/choons/back/internal/httpx"
	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/party"
	"github.com/Team-Odysseia/choons/back/internal/service"
	"github.com/Team-Odysseia/choons/back/internal/storage"
)

const (
	maxFileBytes    = 200 << 20
	maxRequestBytes = 1 << 30
	maxJSONBytes    = 1 << 20
	maxBatchItems   = 2000
	multipartMemory = 16 << 20
	authCookieAge   = int(auth.TokenTTL / time.Second)
)

type Handler struct {
	DB         *gorm.DB
	Users      *service.Users
	Catalog    *service.Catalog
	Library    *service.Library
	Playlists  *service.Playlists
	Parties    *service.Parties
	Hub        *party.Hub
	Store      storage.Storage
	Tokens     *auth.Tokens
	Cookie     auth.Cookie
	StreamTTL  time.Duration
	ImageTTL   time.Duration
	SSETimeout time.Duration
	Heartbeat  time.Duration
	Closing    <-chan struct{}
}

func user(c *gin.Context) *model.User { return auth.CurrentUser(c) }

func queryInt(c *gin.Context, name string, def int) (int, error) {
	v := strings.TrimSpace(c.Query(name))
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, apperr.BadRequest("%s must be a number", name)
	}
	return n, nil
}

func queryUUID(c *gin.Context, name string) (*uuid.UUID, error) {
	v := strings.TrimSpace(c.Query(name))
	if v == "" {
		return nil, nil
	}
	id, err := uuid.Parse(v)
	if err != nil {
		return nil, apperr.BadRequest("Invalid %s", name)
	}
	return &id, nil
}

func page(c *gin.Context) (*service.Page, error) {
	p, err := queryInt(c, "page", 0)
	if err != nil {
		return nil, err
	}
	s, err := queryInt(c, "size", 100)
	if err != nil {
		return nil, err
	}
	return &service.Page{Page: p, Size: s}, nil
}

var uploadRoutes = map[string]bool{
	"POST /admin/artists":      true,
	"PUT /admin/artists/:id":   true,
	"POST /admin/albums":       true,
	"PUT /admin/albums/:id":    true,
	"POST /admin/tracks":       true,
	"POST /admin/tracks/batch": true,
}

func limitBody(c *gin.Context) {
	limit := int64(maxJSONBytes)
	if uploadRoutes[c.Request.Method+" "+c.FullPath()] {
		limit = maxRequestBytes
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)
	c.Next()
}

type form struct {
	c   *gin.Context
	err error
}

func newForm(c *gin.Context) *form {
	f := &form{c: c}
	if err := c.Request.ParseMultipartForm(multipartMemory); err != nil && !errors.Is(err, http.ErrNotMultipart) {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			f.err = apperr.New(http.StatusRequestEntityTooLarge, "Maximum upload size exceeded")
		} else {
			f.err = apperr.BadRequest("Malformed multipart request")
		}
	}
	return f
}

func (f *form) fail(err error) {
	if f.err == nil {
		f.err = err
	}
}

func (f *form) value(name string) (string, bool) {
	return f.c.GetPostForm(name)
}

func (f *form) str(name string) string {
	v, ok := f.value(name)
	if !ok {
		f.fail(apperr.BadRequest("%s is required", name))
	}
	return v
}

func (f *form) optStr(name string) *string {
	v, ok := f.value(name)
	if !ok {
		return nil
	}
	return &v
}

func (f *form) integer(name string, def *int) int {
	v, ok := f.value(name)
	if !ok || strings.TrimSpace(v) == "" {
		if def != nil {
			return *def
		}
		f.fail(apperr.BadRequest("%s is required", name))
		return 0
	}
	n, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil {
		f.fail(apperr.BadRequest("%s must be a number", name))
	}
	return n
}

func (f *form) id(name string) uuid.UUID {
	v := f.str(name)
	if f.err != nil {
		return uuid.Nil
	}
	id, err := uuid.Parse(strings.TrimSpace(v))
	if err != nil {
		f.fail(apperr.BadRequest("Invalid %s", name))
	}
	return id
}

func (f *form) list(name string) []string {
	if f.c.Request.MultipartForm == nil {
		return nil
	}
	return f.c.Request.MultipartForm.Value[name]
}

func (f *form) files(name string) []*service.Upload {
	if f.c.Request.MultipartForm == nil {
		return nil
	}
	headers := f.c.Request.MultipartForm.File[name]
	out := make([]*service.Upload, 0, len(headers))
	for _, fh := range headers {
		if fh.Size > maxFileBytes {
			f.fail(apperr.New(http.StatusRequestEntityTooLarge, "Maximum upload size exceeded"))
			return nil
		}
		out = append(out, &service.Upload{
			ContentType: fh.Header.Get("Content-Type"),
			Size:        fh.Size,
			Open:        func() (io.ReadCloser, error) { return fh.Open() },
		})
	}
	return out
}

func (f *form) file(name string, required bool) *service.Upload {
	files := f.files(name)
	if len(files) == 0 {
		if required {
			f.fail(apperr.BadRequest("%s is required", name))
		}
		return nil
	}
	return files[0]
}

func healthz(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		sqlDB, err := gdb.DB()
		if err == nil {
			err = sqlDB.PingContext(c.Request.Context())
		}
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "down"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "up"})
	}
}

func notFound(c *gin.Context) {
	if user(c) == nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	c.AbortWithStatusJSON(http.StatusNotFound, httpx.ErrorBody{Error: "Not found"})
}
