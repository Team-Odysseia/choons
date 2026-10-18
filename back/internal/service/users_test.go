package service

import (
	"testing"

	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/auth"
	"github.com/Team-Odysseia/choons/back/internal/model"
)

func TestRegisterAndAuthenticate(t *testing.T) {
	e := newEnv(t)
	users := NewUsers(e.db)
	u, err := users.Register(e.ctx, "  alice  ", "secret1", model.RoleListener)
	if err != nil {
		t.Fatal(err)
	}
	if u.Username != "alice" || u.Role != model.RoleListener || u.ID.Version() != 7 {
		t.Fatalf("%+v", u)
	}
	got, err := users.Authenticate(e.ctx, "alice", "secret1")
	if err != nil || got.ID != u.ID {
		t.Fatalf("%v %v", got, err)
	}
	_, err = users.Authenticate(e.ctx, "alice", "wrong")
	wantAppErr(t, err, 401, "Invalid credentials")
	_, err = users.Authenticate(e.ctx, "nobody", "secret1")
	wantAppErr(t, err, 401, "Invalid credentials")
	_, err = users.Register(e.ctx, "alice", "secret2", model.RoleListener)
	wantAppErr(t, err, 409, "Username already exists")
}

func TestAuthenticateUserWithSpringHash(t *testing.T) {
	e := newEnv(t)
	e.db.Create(&model.User{Username: "legacy", Role: model.RoleListener,
		Password: "$2a$10$2SMB8ia1yqQy2SnNFKDUseixVgQEK2E/8gXhYKLSaF3.HT6YDwdUK"})
	if _, err := NewUsers(e.db).Authenticate(e.ctx, "legacy", "listenerpass"); err != nil {
		t.Fatalf("legacy hash rejected: %v", err)
	}
}

func TestEnsureAdmin(t *testing.T) {
	e := newEnv(t)
	users := NewUsers(e.db)
	created, err := users.EnsureAdmin(e.ctx, "root", "rootpass")
	if err != nil || !created {
		t.Fatalf("%v %v", created, err)
	}
	created, err = users.EnsureAdmin(e.ctx, "other", "otherpass")
	if err != nil || created {
		t.Fatalf("second call must not create: %v %v", created, err)
	}
	u, err := users.Authenticate(e.ctx, "root", "rootpass")
	if err != nil || u.Role != model.RoleAdmin {
		t.Fatalf("%+v %v", u, err)
	}
}

func TestListenersAdmin(t *testing.T) {
	e := newEnv(t)
	users := NewUsers(e.db)
	admin := e.user(t, "admin", model.RoleAdmin)
	bob := e.user(t, "Bob", model.RoleListener)
	e.user(t, "carol", model.RoleListener)
	e.user(t, "bobby", model.RoleListener)

	all, _ := users.ListListeners(e.ctx, "")
	if len(all) != 3 || all[0].Username != "Bob" {
		t.Fatalf("%+v", all)
	}
	filtered, _ := users.ListListeners(e.ctx, " BOB ")
	if len(filtered) != 2 {
		t.Fatalf("case-insensitive contains: %+v", filtered)
	}

	_, err := users.UpdateListener(e.ctx, bob.ID, "carol", "")
	wantAppErr(t, err, 400, "Username already in use")
	_, err = users.UpdateListener(e.ctx, bob.ID, "   ", "")
	wantAppErr(t, err, 400, "Username is required")
	_, err = users.UpdateListener(e.ctx, admin.ID, "x", "")
	wantAppErr(t, err, 404, "Listener not found: "+admin.ID.String())

	upd, err := users.UpdateListener(e.ctx, bob.ID, " robert ", "")
	if err != nil || upd.Username != "robert" {
		t.Fatalf("%+v %v", upd, err)
	}
	var stored model.User
	e.db.First(&stored, "id = ?", bob.ID)
	if stored.Password != "x" {
		t.Fatal("blank password must not change hash")
	}
	if _, err := users.UpdateListener(e.ctx, bob.ID, "robert", "newpass1"); err != nil {
		t.Fatal(err)
	}
	e.db.First(&stored, "id = ?", bob.ID)
	if !auth.CheckPassword(stored.Password, "newpass1") {
		t.Fatal("password not updated")
	}

	ban, err := users.SetRequestBan(e.ctx, bob.ID, true)
	if err != nil || !ban.RequestsBlocked || ban.Username != "robert" {
		t.Fatalf("%+v %v", ban, err)
	}
	missing := uuid.New()
	_, err = users.SetRequestBan(e.ctx, missing, true)
	wantAppErr(t, err, 404, "User not found: "+missing.String())

	wantAppErr(t, users.DeleteListener(e.ctx, admin.ID), 404, "")
	if err := users.DeleteListener(e.ctx, bob.ID); err != nil {
		t.Fatal(err)
	}
	if left, _ := users.ListListeners(e.ctx, ""); len(left) != 2 {
		t.Fatalf("%+v", left)
	}
}

func TestDeleteListenerWithDependentData(t *testing.T) {
	e := newEnv(t)
	users := NewUsers(e.db)
	lib := NewLibrary(e.db)
	pls := NewPlaylists(e.db)
	bob := e.user(t, "bob", model.RoleListener)
	artist := e.artist(t, "A")
	tr := e.track(t, e.album(t, artist, "x", 1), "t", 1)
	p, _ := pls.Create(e.ctx, bob, "mine")
	if _, err := pls.AddTrack(e.ctx, bob, p.ID, tr.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := lib.AddFavorite(e.ctx, bob, tr.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := lib.SubmitRequest(e.ctx, bob, AlbumRequestInput{AlbumName: "a", ArtistName: "b", ExternalURL: "https://x"}); err != nil {
		t.Fatal(err)
	}
	if err := e.catalog.RecordPlay(e.ctx, bob.ID, tr.ID); err != nil {
		t.Fatal(err)
	}
	if err := users.DeleteListener(e.ctx, bob.ID); err != nil {
		t.Fatalf("delete with dependents (was FK 409 in Java): %v", err)
	}
	for _, table := range []string{"playlists", "playlist_tracks", "favorites", "album_requests", "stream_events"} {
		if n := e.count(t, table); n != 0 {
			t.Errorf("%s has %d rows", table, n)
		}
	}
}
