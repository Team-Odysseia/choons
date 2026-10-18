package service

import (
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/dto"
	"github.com/Team-Odysseia/choons/back/internal/model"
)

func trackIDs(p dto.Playlist) []uuid.UUID {
	return ids(p.Tracks, func(t dto.Track) uuid.UUID { return t.ID })
}

func TestPlaylistCrudAndAccess(t *testing.T) {
	e := newEnv(t)
	pls := NewPlaylists(e.db)
	bob := e.user(t, "bob", model.RoleListener)
	amy := e.user(t, "amy", model.RoleListener)
	album := e.album(t, e.artist(t, "A"), "x", 1)
	t1, t2 := e.track(t, album, "one", 1), e.track(t, album, "two", 2)

	p, err := pls.Create(e.ctx, bob, "Road trip")
	if err != nil {
		t.Fatal(err)
	}
	if p.Name != "Road trip" || p.OwnerID != bob.ID || p.IsPublic || p.Tracks == nil || len(p.Tracks) != 0 {
		t.Fatalf("%+v", p)
	}
	p, err = pls.AddTrack(e.ctx, bob, p.ID, t1.ID)
	if err != nil {
		t.Fatal(err)
	}
	p, _ = pls.AddTrack(e.ctx, bob, p.ID, t2.ID)
	p, _ = pls.AddTrack(e.ctx, bob, p.ID, t1.ID)
	if !slices.Equal(trackIDs(p), []uuid.UUID{t1.ID, t2.ID, t1.ID}) {
		t.Fatalf("duplicates allowed, appended: %v", trackIDs(p))
	}
	if p.Tracks[0].Album.Artist.Name != "A" {
		t.Fatal("tracks not fully loaded")
	}

	_, err = pls.Get(e.ctx, amy, p.ID)
	wantAppErr(t, err, 403, "Access denied")
	_, err = pls.AddTrack(e.ctx, amy, p.ID, t1.ID)
	wantAppErr(t, err, 403, "Access denied")
	missing := uuid.New()
	_, err = pls.AddTrack(e.ctx, bob, p.ID, missing)
	wantAppErr(t, err, 404, "Track not found: "+missing.String())
	_, err = pls.Get(e.ctx, bob, missing)
	wantAppErr(t, err, 404, "Playlist not found: "+missing.String())

	p, err = pls.SetVisibility(e.ctx, bob, p.ID, true)
	if err != nil || !p.IsPublic {
		t.Fatalf("%+v %v", p, err)
	}
	if got, err := pls.Get(e.ctx, amy, p.ID); err != nil || len(got.Tracks) != 3 {
		t.Fatalf("public playlist readable by others: %v", err)
	}
	_, err = pls.SetVisibility(e.ctx, amy, p.ID, false)
	wantAppErr(t, err, 403, "Access denied")

	p, err = pls.RemoveTrack(e.ctx, bob, p.ID, t1.ID)
	if err != nil || !slices.Equal(trackIDs(p), []uuid.UUID{t2.ID}) {
		t.Fatalf("remove removes all copies: %v %v", trackIDs(p), err)
	}
	var positions []int
	e.db.Model(&model.PlaylistTrack{}).Where("playlist_id = ?", p.ID).Order("position").Pluck("position", &positions)
	if !slices.Equal(positions, []int{0}) {
		t.Fatalf("reindexed positions %v", positions)
	}

	wantAppErr(t, pls.Delete(e.ctx, amy, p.ID), 403, "Access denied")
	if err := pls.Delete(e.ctx, bob, p.ID); err != nil {
		t.Fatal(err)
	}
	if e.count(t, "playlist_tracks") != 0 {
		t.Fatal("entries not cascaded")
	}
}

func TestPlaylistSummaries(t *testing.T) {
	e := newEnv(t)
	pls := NewPlaylists(e.db)
	bob := e.user(t, "bob", model.RoleListener)
	amy := e.user(t, "amy", model.RoleListener)
	tr := e.track(t, e.album(t, e.artist(t, "A"), "x", 1), "t", 1)

	older, _ := pls.Create(e.ctx, bob, "older")
	time.Sleep(2 * time.Millisecond)
	newer, _ := pls.Create(e.ctx, bob, "newer")
	pls.AddTrack(e.ctx, bob, newer.ID, tr.ID)
	pls.AddTrack(e.ctx, bob, newer.ID, tr.ID)
	pls.SetVisibility(e.ctx, bob, older.ID, true)
	amyPublic, _ := pls.Create(e.ctx, amy, "amy public")
	pls.SetVisibility(e.ctx, amy, amyPublic.ID, true)
	pls.Create(e.ctx, amy, "amy private")

	mine, _ := pls.Mine(e.ctx, bob)
	if len(mine) != 2 || mine[0].ID != older.ID {
		t.Fatalf("ordered by updatedAt desc (visibility bumped older): %+v", mine)
	}
	if mine[1].TrackCount != 2 || mine[0].TrackCount != 0 || !mine[0].IsPublic {
		t.Fatalf("%+v", mine)
	}
	public, _ := pls.Public(e.ctx, bob)
	if len(public) != 1 || public[0].ID != amyPublic.ID {
		t.Fatalf("public excludes own and private: %+v", public)
	}
	if none, _ := pls.Public(e.ctx, e.user(t, "zed", model.RoleListener)); len(none) != 2 {
		t.Fatalf("%+v", none)
	}
}

func TestPlaylistReorder(t *testing.T) {
	e := newEnv(t)
	pls := NewPlaylists(e.db)
	bob := e.user(t, "bob", model.RoleListener)
	album := e.album(t, e.artist(t, "A"), "x", 1)
	a, b, c := e.track(t, album, "a", 1), e.track(t, album, "b", 2), e.track(t, album, "c", 3)
	p, _ := pls.Create(e.ctx, bob, "p")
	for _, tr := range []*model.Track{a, b, c} {
		p, _ = pls.AddTrack(e.ctx, bob, p.ID, tr.ID)
	}

	got, err := pls.Reorder(e.ctx, bob, p.ID, []uuid.UUID{c.ID, a.ID, b.ID})
	if err != nil {
		t.Fatalf("reorder hit unique(playlist_id, position)? %v", err)
	}
	if !slices.Equal(trackIDs(got), []uuid.UUID{c.ID, a.ID, b.ID}) {
		t.Fatalf("%v", trackIDs(got))
	}
	got, err = pls.Reorder(e.ctx, bob, p.ID, []uuid.UUID{b.ID, c.ID, a.ID})
	if err != nil || !slices.Equal(trackIDs(got), []uuid.UUID{b.ID, c.ID, a.ID}) {
		t.Fatalf("second reorder %v %v", trackIDs(got), err)
	}

	_, err = pls.Reorder(e.ctx, bob, p.ID, []uuid.UUID{a.ID, b.ID})
	wantAppErr(t, err, 400, "Reorder list size mismatch")
	_, err = pls.Reorder(e.ctx, bob, p.ID, []uuid.UUID{a.ID, a.ID, b.ID})
	wantAppErr(t, err, 400, "Reorder list contains duplicate track IDs")
	_, err = pls.Reorder(e.ctx, bob, p.ID, []uuid.UUID{a.ID, b.ID, uuid.New()})
	wantAppErr(t, err, 400, "Reorder list must contain all playlist tracks exactly once")
	_, err = pls.Reorder(e.ctx, e.user(t, "amy", model.RoleListener), p.ID, []uuid.UUID{a.ID, b.ID, c.ID})
	wantAppErr(t, err, 403, "Access denied")

	p, _ = pls.AddTrack(e.ctx, bob, p.ID, a.ID)
	_, err = pls.Reorder(e.ctx, bob, p.ID, []uuid.UUID{a.ID, b.ID, c.ID, uuid.New()})
	wantAppErr(t, err, 400, "Reorder list must contain all playlist tracks exactly once")
}
