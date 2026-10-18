package service

import (
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

func TestAlbumRequestLifecycle(t *testing.T) {
	e := newEnv(t)
	lib := NewLibrary(e.db)
	bob := e.user(t, "bob", model.RoleListener)
	amy := e.user(t, "amy", model.RoleListener)

	r, err := lib.SubmitRequest(e.ctx, bob, AlbumRequestInput{AlbumName: "  Untrue ", ArtistName: " Burial ", ExternalURL: " https://example.com/x "})
	if err != nil {
		t.Fatal(err)
	}
	if r.AlbumName != "Untrue" || r.ArtistName != "Burial" || r.ExternalURL != "https://example.com/x" ||
		r.Status != model.RequestPending || r.RequesterUsername != "bob" || r.RequesterID != bob.ID || r.AdminNote != nil {
		t.Fatalf("%+v", r)
	}
	time.Sleep(2 * time.Millisecond)
	second, _ := lib.SubmitRequest(e.ctx, bob, AlbumRequestInput{AlbumName: "b", ArtistName: "b", ExternalURL: "http://b"})
	if _, err := lib.SubmitRequest(e.ctx, amy, AlbumRequestInput{AlbumName: "c", ArtistName: "c", ExternalURL: "http://c"}); err != nil {
		t.Fatal(err)
	}

	mine, _ := lib.MyRequests(e.ctx, bob)
	if len(mine) != 2 || mine[0].ID != second.ID {
		t.Fatalf("newest first, only mine: %+v", mine)
	}
	all, _ := lib.AllRequests(e.ctx)
	if len(all) != 3 {
		t.Fatalf("%d", len(all))
	}

	_, err = lib.SetRequestStatus(e.ctx, r.ID, model.RequestPending)
	wantAppErr(t, err, 400, "Status can only be ACCEPTED or REJECTED")
	missing := uuid.New()
	_, err = lib.SetRequestStatus(e.ctx, missing, model.RequestAccepted)
	wantAppErr(t, err, 404, "Album request not found: "+missing.String())

	wantAppErr(t, lib.DeleteMyRequest(e.ctx, amy, r.ID), 403, "Access denied")
	accepted, err := lib.SetRequestStatus(e.ctx, r.ID, model.RequestAccepted)
	if err != nil || accepted.Status != model.RequestAccepted || accepted.RequesterUsername != "bob" {
		t.Fatalf("%+v %v", accepted, err)
	}
	wantAppErr(t, lib.DeleteMyRequest(e.ctx, bob, r.ID), 409, "Only pending requests can be deleted")
	if err := lib.DeleteMyRequest(e.ctx, bob, second.ID); err != nil {
		t.Fatal(err)
	}
	wantAppErr(t, lib.DeleteMyRequest(e.ctx, bob, second.ID), 404, "")
}

func TestBlockedListenerCannotRequest(t *testing.T) {
	e := newEnv(t)
	lib := NewLibrary(e.db)
	bob := e.user(t, "bob", model.RoleListener)
	stale := *bob
	if _, err := NewUsers(e.db).SetRequestBan(e.ctx, bob.ID, true); err != nil {
		t.Fatal(err)
	}
	_, err := lib.SubmitRequest(e.ctx, &stale, AlbumRequestInput{AlbumName: "a", ArtistName: "b", ExternalURL: "https://x"})
	wantAppErr(t, err, 403, "Album requests are disabled for this user")
	all, _ := lib.AllRequests(e.ctx)
	if len(all) != 0 {
		t.Fatal("request persisted")
	}
}

func TestFavorites(t *testing.T) {
	e := newEnv(t)
	lib := NewLibrary(e.db)
	bob := e.user(t, "bob", model.RoleListener)
	amy := e.user(t, "amy", model.RoleListener)
	album := e.album(t, e.artist(t, "A"), "x", 1)
	t1, t2, t3 := e.track(t, album, "one", 1), e.track(t, album, "two", 2), e.track(t, album, "three", 3)

	if _, err := lib.AddFavorite(e.ctx, bob, t1.ID); err != nil {
		t.Fatal(err)
	}
	time.Sleep(2 * time.Millisecond)
	got, err := lib.AddFavorite(e.ctx, bob, t2.ID)
	if err != nil || got.ID != t2.ID || got.Album.Artist.Name != "A" {
		t.Fatalf("%+v %v", got, err)
	}
	if _, err := lib.AddFavorite(e.ctx, bob, t2.ID); err != nil {
		t.Fatalf("idempotent add: %v", err)
	}
	if _, err := lib.AddFavorite(e.ctx, amy, t3.ID); err != nil {
		t.Fatal(err)
	}
	missing := uuid.New()
	_, err = lib.AddFavorite(e.ctx, bob, missing)
	wantAppErr(t, err, 404, "Track not found: "+missing.String())

	favs, _ := lib.Favorites(e.ctx, bob)
	if len(favs) != 2 || favs[0].Track.ID != t2.ID || favs[0].FavoritedAt.IsZero() || favs[0].Track.Artist.Name != "A" {
		t.Fatalf("newest first: %+v", favs)
	}
	check, _ := lib.CheckFavorites(e.ctx, bob, []uuid.UUID{t1.ID, t3.ID, missing})
	if !slices.Equal(check, []uuid.UUID{t1.ID}) {
		t.Fatalf("check %v", check)
	}
	if empty, _ := lib.CheckFavorites(e.ctx, bob, nil); empty == nil || len(empty) != 0 {
		t.Fatal("empty check must be []")
	}
	if err := lib.RemoveFavorite(e.ctx, bob, t1.ID); err != nil {
		t.Fatal(err)
	}
	if err := lib.RemoveFavorite(e.ctx, bob, t1.ID); err != nil {
		t.Fatalf("idempotent remove: %v", err)
	}
	if favs, _ := lib.Favorites(e.ctx, bob); len(favs) != 1 {
		t.Fatalf("%+v", favs)
	}
}
