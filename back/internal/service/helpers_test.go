package service

import (
	"bytes"
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/storage"
	"github.com/Team-Odysseia/choons/back/internal/testutil/pgtest"
)

var (
	flacBytes = append([]byte("fLaC"), bytes.Repeat([]byte{0}, 64)...)
	mp3Bytes  = append([]byte("ID3\x04"), bytes.Repeat([]byte{1}, 64)...)
	pngBytes  = append([]byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}, bytes.Repeat([]byte{2}, 32)...)
	jpgBytes  = append([]byte{0xFF, 0xD8, 0xFF, 0xE0}, bytes.Repeat([]byte{3}, 32)...)
)

func upload(ct string, data []byte) *Upload {
	return &Upload{
		ContentType: ct,
		Size:        int64(len(data)),
		Open:        func() (io.ReadCloser, error) { return io.NopCloser(bytes.NewReader(data)), nil },
	}
}

type fakeLyrics struct {
	id    *int
	err   error
	calls []string
}

func (f *fakeLyrics) Find(_ context.Context, title, artist, album string, d int) (*int, error) {
	f.calls = append(f.calls, title+"|"+artist+"|"+album)
	return f.id, f.err
}

type env struct {
	db      *gorm.DB
	store   *storage.Fake
	lyrics  *fakeLyrics
	catalog *Catalog
	ctx     context.Context
}

func newEnv(t *testing.T) *env {
	t.Helper()
	gdb := pgtest.NewDB(t)
	store := storage.NewFake()
	lyrics := &fakeLyrics{}
	c := NewCatalog(gdb, store, lyrics)
	c.SetAsync(func(f func()) { f() })
	return &env{db: gdb, store: store, lyrics: lyrics, catalog: c, ctx: context.Background()}
}

func (e *env) user(t *testing.T, name string, role model.Role) *model.User {
	t.Helper()
	u := &model.User{Username: name, Role: role, Password: "x"}
	if err := e.db.Create(u).Error; err != nil {
		t.Fatal(err)
	}
	return u
}

func (e *env) artist(t *testing.T, name string) *model.Artist {
	t.Helper()
	a := &model.Artist{Name: name}
	if err := e.db.Create(a).Error; err != nil {
		t.Fatal(err)
	}
	return a
}

func (e *env) album(t *testing.T, artist *model.Artist, title string, year int) *model.Album {
	t.Helper()
	a := &model.Album{Title: title, ArtistID: artist.ID, ReleaseYear: year}
	if err := e.db.Omit("Artist").Create(a).Error; err != nil {
		t.Fatal(err)
	}
	return a
}

func (e *env) track(t *testing.T, album *model.Album, title string, n int) *model.Track {
	t.Helper()
	tr := &model.Track{Title: title, AlbumID: album.ID, ArtistID: album.ArtistID, TrackNumber: n, DurationSeconds: 100,
		R2Key: "audio/" + title + ".mp3", ContentType: "audio/mpeg"}
	if err := e.db.Omit("Album", "Artist").Create(tr).Error; err != nil {
		t.Fatal(err)
	}
	return tr
}

func (e *env) count(t *testing.T, table string) int64 {
	t.Helper()
	var n int64
	if err := e.db.Table(table).Count(&n).Error; err != nil {
		t.Fatal(err)
	}
	return n
}

func wantAppErr(t *testing.T, err error, status int, msg string) {
	t.Helper()
	var ae *apperr.Error
	if !errors.As(err, &ae) {
		t.Fatalf("want apperr %d %q, got %v", status, msg, err)
	}
	if ae.Status != status || (msg != "" && ae.Message != msg) {
		t.Fatalf("got %d %q want %d %q", ae.Status, ae.Message, status, msg)
	}
}

func ids[T any](items []T, id func(T) uuid.UUID) []uuid.UUID {
	out := make([]uuid.UUID, len(items))
	for i, it := range items {
		out[i] = id(it)
	}
	return out
}

func (e *env) avatarKey(t *testing.T, id uuid.UUID) string {
	t.Helper()
	var a model.Artist
	if err := e.db.First(&a, "id = ?", id).Error; err != nil || a.AvatarKey == nil {
		t.Fatalf("artist %s has no avatar: %v", id, err)
	}
	return *a.AvatarKey
}

func (e *env) coverKey(t *testing.T, id uuid.UUID) string {
	t.Helper()
	var a model.Album
	if err := e.db.First(&a, "id = ?", id).Error; err != nil || a.CoverKey == nil {
		t.Fatalf("album %s has no cover: %v", id, err)
	}
	return *a.CoverKey
}

func imageKeyLike(key, kind string, id uuid.UUID, ext string) bool {
	rest, ok := strings.CutPrefix(key, "images/"+kind+"/"+id.String()+"-")
	if !ok {
		return false
	}
	version, ok := strings.CutSuffix(rest, "."+ext)
	if !ok {
		return false
	}
	_, err := uuid.Parse(version)
	return err == nil
}
