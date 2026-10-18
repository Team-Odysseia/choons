package service

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/dto"
	"github.com/Team-Odysseia/choons/back/internal/model"
)

func TestCreateArtistWithAndWithoutAvatar(t *testing.T) {
	e := newEnv(t)
	plain, err := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "Aphex Twin"})
	if err != nil {
		t.Fatal(err)
	}
	if plain.AvatarURL != nil || plain.Bio != nil || plain.ID.Version() != 7 {
		t.Fatalf("plain artist %+v", plain)
	}
	bio := "Warp"
	withAvatar, err := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "Autechre", Bio: &bio, Avatar: upload("image/png", pngBytes)})
	if err != nil {
		t.Fatal(err)
	}
	key := e.avatarKey(t, withAvatar.ID)
	if !imageKeyLike(key, "artists", withAvatar.ID, "png") || !e.store.Has(key) || e.store.Objects[key].ContentType != "image/png" {
		t.Fatalf("avatar not stored: %v", e.store.Keys())
	}
	if withAvatar.AvatarURL == nil || *withAvatar.AvatarURL != "/media/images/artists/"+withAvatar.ID.String() || *withAvatar.Bio != "Warp" {
		t.Fatalf("artist %+v", withAvatar)
	}
	var stored model.Artist
	e.db.First(&stored, "id = ?", withAvatar.ID)
	if stored.AvatarKey == nil || *stored.AvatarKey != key {
		t.Fatalf("avatar key not persisted: %+v", stored)
	}
}

func TestCreateArtistEmptyAvatarIgnored(t *testing.T) {
	e := newEnv(t)
	a, err := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "X", Avatar: upload("image/png", nil)})
	if err != nil || a.AvatarURL != nil || len(e.store.Keys()) != 0 {
		t.Fatalf("%+v %v %v", a, err, e.store.Keys())
	}
}

func TestCreateArtistInvalidAvatarRejectedBeforeInsert(t *testing.T) {
	e := newEnv(t)
	_, err := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "X", Avatar: upload("image/png", jpgBytes)})
	wantAppErr(t, err, 400, "File content does not match claimed content type. Claimed: image/png")
	if e.count(t, "artists") != 0 {
		t.Fatal("artist inserted despite invalid avatar")
	}
}

func TestCreateArtistDuplicateName(t *testing.T) {
	e := newEnv(t)
	e.artist(t, "Dup")
	_, err := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "Dup"})
	if !errors.Is(err, gorm.ErrDuplicatedKey) {
		t.Fatalf("want duplicate key, got %v", err)
	}
}

func TestCreateArtistStorageFailureRollsBack(t *testing.T) {
	e := newEnv(t)
	e.store.FailPut = errors.New("r2 down")
	if _, err := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "X", Avatar: upload("image/png", pngBytes)}); err == nil {
		t.Fatal("expected error")
	}
	if e.count(t, "artists") != 0 {
		t.Fatal("artist persisted after failed upload")
	}
}

func TestUpdateArtistReplacesAvatarAndDeletesStaleKey(t *testing.T) {
	e := newEnv(t)
	a, _ := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "Old", Avatar: upload("image/png", pngBytes)})
	oldKey := e.avatarKey(t, a.ID)
	bio := "new bio"
	got, err := e.catalog.UpdateArtist(e.ctx, a.ID, ArtistInput{Name: "New", Bio: &bio, Avatar: upload("image/jpeg", jpgBytes)})
	if err != nil {
		t.Fatal(err)
	}
	newKey := e.avatarKey(t, a.ID)
	if got.Name != "New" || *got.Bio != "new bio" || !imageKeyLike(newKey, "artists", a.ID, "jpg") || !e.store.Has(newKey) || e.store.Has(oldKey) {
		t.Fatalf("%+v keys=%v", got, e.store.Keys())
	}

	if _, err := e.catalog.UpdateArtist(e.ctx, a.ID, ArtistInput{Name: "New", Avatar: upload("image/jpeg", jpgBytes)}); err != nil {
		t.Fatal(err)
	}
	if sameExt := e.avatarKey(t, a.ID); sameExt == newKey || !e.store.Has(sameExt) || e.store.Has(newKey) {
		t.Fatalf("same-extension replace must use a fresh key: %s -> %s keys=%v", newKey, sameExt, e.store.Keys())
	}

	got, err = e.catalog.UpdateArtist(e.ctx, a.ID, ArtistInput{Name: "Newer"})
	if err != nil || got.AvatarURL == nil || got.Bio != nil {
		t.Fatalf("update without avatar should keep it and clear bio: %+v %v", got, err)
	}
}

func TestFailedImageUpdateKeepsCurrentObject(t *testing.T) {
	e := newEnv(t)
	e.artist(t, "Taken")
	a, _ := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "Mine", Avatar: upload("image/png", pngBytes)})
	avatar := e.avatarKey(t, a.ID)
	if _, err := e.catalog.UpdateArtist(e.ctx, a.ID, ArtistInput{Name: "Taken", Avatar: upload("image/png", pngBytes)}); err == nil {
		t.Fatal("expected duplicate name error")
	}
	if e.avatarKey(t, a.ID) != avatar || !e.store.Has(avatar) || len(e.store.Keys()) != 1 {
		t.Fatalf("live avatar lost or orphan left: key=%s keys=%v", avatar, e.store.Keys())
	}

	al, _ := e.catalog.CreateAlbum(e.ctx, AlbumInput{Title: "x", ArtistID: a.ID, ReleaseYear: 1, Cover: upload("image/png", pngBytes)})
	cover := e.coverKey(t, al.ID)
	if _, err := e.catalog.UpdateAlbum(e.ctx, al.ID, AlbumInput{Title: "x", ArtistID: uuid.New(), ReleaseYear: 1, Cover: upload("image/png", pngBytes)}); err == nil {
		t.Fatal("expected unknown artist error")
	}
	if e.coverKey(t, al.ID) != cover || !e.store.Has(cover) || len(e.store.Keys()) != 2 {
		t.Fatalf("live cover lost or orphan left: key=%s keys=%v", cover, e.store.Keys())
	}
}

func TestUpdateArtistNotFound(t *testing.T) {
	e := newEnv(t)
	id := uuid.New()
	_, err := e.catalog.UpdateArtist(e.ctx, id, ArtistInput{Name: "x"})
	wantAppErr(t, err, 404, "Artist not found: "+id.String())
}

func TestDeleteArtistCascadesAndRemovesObjects(t *testing.T) {
	e := newEnv(t)
	artist, _ := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "A", Avatar: upload("image/png", pngBytes)})
	album, _ := e.catalog.CreateAlbum(e.ctx, AlbumInput{Title: "Al", ArtistID: artist.ID, ReleaseYear: 2001, Cover: upload("image/jpeg", jpgBytes)})
	tr, err := e.catalog.UploadTrack(e.ctx, TrackInput{Title: "T", AlbumID: album.ID, ArtistID: artist.ID, TrackNumber: 1, Audio: upload("audio/flac", flacBytes)})
	if err != nil {
		t.Fatal(err)
	}
	pendingAlbum := e.album(t, &model.Artist{Base: model.Base{ID: artist.ID}}, "P", 2002)
	pending := e.track(t, pendingAlbum, "pending-track", 1)
	e.db.Model(pending).Update("r2_key", model.PendingKey)
	u := e.user(t, "listener", model.RoleListener)
	e.db.Create(&model.Favorite{UserID: u.ID, TrackID: tr.ID})
	e.db.Create(&model.StreamEvent{UserID: u.ID, TrackID: tr.ID})

	if err := e.catalog.DeleteArtist(e.ctx, artist.ID); err != nil {
		t.Fatal(err)
	}
	for _, table := range []string{"artists", "albums", "tracks", "favorites", "stream_events"} {
		if n := e.count(t, table); n != 0 {
			t.Errorf("%s has %d rows", table, n)
		}
	}
	if len(e.store.Keys()) != 0 {
		t.Fatalf("objects left: %v", e.store.Keys())
	}
	if e.store.WasDeleted(model.PendingKey) {
		t.Fatal("tried to delete pending placeholder key")
	}
	if e.count(t, "users") != 1 {
		t.Fatal("user should survive")
	}
}

func TestDeleteArtistAvatar(t *testing.T) {
	e := newEnv(t)
	a, _ := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "A", Avatar: upload("image/png", pngBytes)})
	if err := e.catalog.DeleteArtistAvatar(e.ctx, a.ID); err != nil {
		t.Fatal(err)
	}
	got, _ := e.catalog.GetArtist(e.ctx, a.ID)
	if got.AvatarURL != nil || len(e.store.Keys()) != 0 {
		t.Fatalf("%+v %v", got, e.store.Keys())
	}
	if err := e.catalog.DeleteArtistAvatar(e.ctx, a.ID); err != nil {
		t.Fatalf("deleting missing avatar should be no-op: %v", err)
	}
	wantAppErr(t, e.catalog.DeleteArtistAvatar(e.ctx, uuid.New()), 404, "")
}

func TestListArtistsSearchAndPaging(t *testing.T) {
	e := newEnv(t)
	for _, n := range []string{"Burial", "boards of canada", "Bonobo", "100% Pure", "Four_Tet"} {
		e.artist(t, n)
	}
	all, _ := e.catalog.ListArtists(e.ctx, "", nil)
	names := func(as []dto.Artist) []string {
		out := []string{}
		for _, a := range as {
			out = append(out, a.Name)
		}
		return out
	}
	if len(all) != 5 {
		t.Fatalf("%v", names(all))
	}
	got, _ := e.catalog.ListArtists(e.ctx, "  BO  ", &Page{Size: 100})
	if !slices.Equal(names(got), []string{"boards of canada", "Bonobo"}) && !slices.Equal(names(got), []string{"Bonobo", "boards of canada"}) {
		t.Fatalf("case-insensitive search: %v", names(got))
	}
	if got, _ := e.catalog.ListArtists(e.ctx, "%", nil); !slices.Equal(names(got), []string{"100% Pure"}) {
		t.Fatalf("percent must be literal: %v", names(got))
	}
	if got, _ := e.catalog.ListArtists(e.ctx, "_", nil); !slices.Equal(names(got), []string{"Four_Tet"}) {
		t.Fatalf("underscore must be literal: %v", names(got))
	}
	p1, _ := e.catalog.ListArtists(e.ctx, "", &Page{Page: 0, Size: 2})
	p2, _ := e.catalog.ListArtists(e.ctx, "", &Page{Page: 1, Size: 2})
	p9, _ := e.catalog.ListArtists(e.ctx, "", &Page{Page: 9, Size: 2})
	if len(p1) != 2 || len(p2) != 2 || len(p9) != 0 || p1[0].ID == p2[0].ID {
		t.Fatalf("paging: %v %v %v", names(p1), names(p2), names(p9))
	}
	neg, _ := e.catalog.ListArtists(e.ctx, "", &Page{Page: -3, Size: 0})
	if len(neg) != 1 || neg[0].ID != all[0].ID {
		t.Fatalf("negative page/size should clamp to page 0 size 1: %v", names(neg))
	}
	if p9 == nil {
		t.Fatal("empty page must be [] not null")
	}
}

func TestListAlbumsOrderingAndSearch(t *testing.T) {
	e := newEnv(t)
	b := e.artist(t, "Burial")
	a := e.artist(t, "Aphex")
	e.album(t, b, "Untrue", 2007)
	e.album(t, b, "Burial", 2006)
	e.album(t, a, "Syro", 2014)
	e.album(t, a, "Drukqs", 2001)

	all, _ := e.catalog.ListAlbums(e.ctx, nil, "", nil)
	titles := func(as []dto.Album) []string {
		out := []string{}
		for _, x := range as {
			out = append(out, x.Title)
		}
		return out
	}
	if !slices.Equal(titles(all), []string{"Drukqs", "Syro", "Burial", "Untrue"}) {
		t.Fatalf("artist name then title: %v", titles(all))
	}
	byArtist, _ := e.catalog.ListAlbums(e.ctx, &b.ID, "", nil)
	if !slices.Equal(titles(byArtist), []string{"Untrue", "Burial"}) {
		t.Fatalf("release year desc: %v", titles(byArtist))
	}
	search, _ := e.catalog.ListAlbums(e.ctx, nil, "aphex", nil)
	if !slices.Equal(titles(search), []string{"Drukqs", "Syro"}) {
		t.Fatalf("search by artist name: %v", titles(search))
	}
	if all[0].Artist.Name != "Aphex" {
		t.Fatalf("artist not preloaded: %+v", all[0])
	}
}

func TestCreateAlbumUnknownArtist(t *testing.T) {
	e := newEnv(t)
	id := uuid.New()
	_, err := e.catalog.CreateAlbum(e.ctx, AlbumInput{Title: "x", ArtistID: id, ReleaseYear: 2000})
	wantAppErr(t, err, 404, "Artist not found: "+id.String())
}

func TestUpdateAlbumMovesArtistAndCover(t *testing.T) {
	e := newEnv(t)
	a1, a2 := e.artist(t, "One"), e.artist(t, "Two")
	al, _ := e.catalog.CreateAlbum(e.ctx, AlbumInput{Title: "x", ArtistID: a1.ID, ReleaseYear: 2000})
	got, err := e.catalog.UpdateAlbum(e.ctx, al.ID, AlbumInput{Title: "y", ArtistID: a2.ID, ReleaseYear: 2010, Cover: upload("image/png", pngBytes)})
	if err != nil {
		t.Fatal(err)
	}
	if got.Title != "y" || got.Artist.Name != "Two" || got.ReleaseYear != 2010 || got.CoverURL == nil {
		t.Fatalf("%+v", got)
	}
	if err := e.catalog.DeleteAlbumCover(e.ctx, al.ID); err != nil {
		t.Fatal(err)
	}
	if got, _ := e.catalog.GetAlbum(e.ctx, al.ID); got.CoverURL != nil || len(e.store.Keys()) != 0 {
		t.Fatalf("cover not removed %+v %v", got, e.store.Keys())
	}
}

func TestDeleteAlbumRemovesTracksPlaylistsAndObjects(t *testing.T) {
	e := newEnv(t)
	artist := e.artist(t, "A")
	album, _ := e.catalog.CreateAlbum(e.ctx, AlbumInput{Title: "x", ArtistID: artist.ID, ReleaseYear: 1, Cover: upload("image/png", pngBytes)})
	tr, _ := e.catalog.UploadTrack(e.ctx, TrackInput{Title: "t", AlbumID: album.ID, ArtistID: artist.ID, Audio: upload("audio/mpeg", mp3Bytes)})
	owner := e.user(t, "o", model.RoleListener)
	pl := model.Playlist{Name: "p", OwnerID: owner.ID}
	e.db.Create(&pl)
	e.db.Create(&model.PlaylistTrack{PlaylistID: pl.ID, TrackID: tr.ID, Position: 0})

	if err := e.catalog.DeleteAlbum(e.ctx, album.ID); err != nil {
		t.Fatal(err)
	}
	if e.count(t, "tracks") != 0 || e.count(t, "playlist_tracks") != 0 || e.count(t, "playlists") != 1 || e.count(t, "artists") != 1 {
		t.Fatal("cascade mismatch")
	}
	if len(e.store.Keys()) != 0 {
		t.Fatalf("objects left %v", e.store.Keys())
	}
	wantAppErr(t, e.catalog.DeleteAlbum(e.ctx, album.ID), 404, "Album not found: "+album.ID.String())
}

func TestUploadTrackStoresAudioAndMatchesLyrics(t *testing.T) {
	e := newEnv(t)
	lyricsID := 4242
	e.lyrics.id = &lyricsID
	artist := e.artist(t, "Burial")
	album := e.album(t, artist, "Untrue", 2007)
	tr, err := e.catalog.UploadTrack(e.ctx, TrackInput{Title: "Archangel", AlbumID: album.ID, ArtistID: artist.ID, TrackNumber: 2, DurationSeconds: 238, Audio: upload("audio/flac", flacBytes)})
	if err != nil {
		t.Fatal(err)
	}
	key := "audio/" + artist.ID.String() + "/" + album.ID.String() + "/" + tr.ID.String() + ".flac"
	obj, ok := e.store.Objects[key]
	if !ok || obj.ContentType != "audio/flac" || len(obj.Body) != len(flacBytes) {
		t.Fatalf("audio not stored correctly: %v", e.store.Keys())
	}
	if !tr.Hifi || tr.Album.Title != "Untrue" || tr.Artist.Name != "Burial" || tr.Album.Artist.Name != "Burial" || tr.TrackNumber != 2 {
		t.Fatalf("%+v", tr)
	}
	if !slices.Equal(e.lyrics.calls, []string{"Archangel|Burial|Untrue"}) {
		t.Fatalf("lyrics calls %v", e.lyrics.calls)
	}
	got, _ := e.catalog.GetTrack(e.ctx, tr.ID)
	if got.LrclibID == nil || *got.LrclibID != 4242 {
		t.Fatalf("lrclib id not saved: %+v", got)
	}
	stored, _ := e.catalog.TrackKey(e.ctx, tr.ID)
	if stored != key {
		t.Fatalf("r2_key %q", stored)
	}
}

func TestUploadTrackRejectsMismatchedAudio(t *testing.T) {
	e := newEnv(t)
	artist := e.artist(t, "A")
	album := e.album(t, artist, "x", 1)
	_, err := e.catalog.UploadTrack(e.ctx, TrackInput{Title: "t", AlbumID: album.ID, ArtistID: artist.ID, Audio: upload("audio/flac", mp3Bytes)})
	wantAppErr(t, err, 400, "File content does not match claimed content type. Claimed: audio/flac")
	_, err = e.catalog.UploadTrack(e.ctx, TrackInput{Title: "t", AlbumID: album.ID, ArtistID: artist.ID, Audio: upload("video/mp4", mp3Bytes)})
	wantAppErr(t, err, 400, "Unsupported audio format: video/mp4")
	if e.count(t, "tracks") != 0 || len(e.store.Keys()) != 0 {
		t.Fatal("nothing should be persisted")
	}
}

func TestUploadBatchIsAtomic(t *testing.T) {
	e := newEnv(t)
	artist := e.artist(t, "A")
	album := e.album(t, artist, "x", 1)
	missing := uuid.New()
	inputs := []TrackInput{
		{Title: "one", AlbumID: album.ID, ArtistID: artist.ID, TrackNumber: 1, Audio: upload("audio/mpeg", mp3Bytes)},
		{Title: "two", AlbumID: missing, ArtistID: artist.ID, TrackNumber: 2, Audio: upload("audio/mpeg", mp3Bytes)},
	}
	_, err := e.catalog.UploadTracks(e.ctx, inputs)
	wantAppErr(t, err, 404, "Album not found: "+missing.String())
	if e.count(t, "tracks") != 0 {
		t.Fatal("first track persisted after batch failure")
	}
	if len(e.store.Keys()) != 0 || len(e.store.Deleted) != 0 {
		t.Fatalf("unknown album must be rejected before uploading: keys=%v deleted=%v", e.store.Keys(), e.store.Deleted)
	}
	if len(e.lyrics.calls) != 0 {
		t.Fatal("lyrics must not run for rolled back uploads")
	}

	inputs[1].AlbumID = album.ID
	out, err := e.catalog.UploadTracks(e.ctx, inputs)
	if err != nil || len(out) != 2 || out[0].Title != "one" || out[1].Title != "two" {
		t.Fatalf("%v %v", out, err)
	}
}

func TestFailedWriteAfterUploadRemovesObjects(t *testing.T) {
	e := newEnv(t)
	e.artist(t, "Dup")
	_, err := e.catalog.CreateArtist(e.ctx, ArtistInput{Name: "Dup", Avatar: upload("image/png", pngBytes)})
	if !errors.Is(err, gorm.ErrDuplicatedKey) {
		t.Fatalf("want duplicate key, got %v", err)
	}
	if len(e.store.Keys()) != 0 {
		t.Fatalf("avatar of rejected artist left behind: keys=%v deleted=%v", e.store.Keys(), e.store.Deleted)
	}

	artist := e.artist(t, "A")
	album := e.album(t, artist, "x", 1)
	failTrackInserts(t, e.db)
	_, err = e.catalog.UploadTracks(e.ctx, []TrackInput{
		{Title: "one", AlbumID: album.ID, ArtistID: artist.ID, TrackNumber: 1, Audio: upload("audio/mpeg", mp3Bytes)},
		{Title: "two", AlbumID: album.ID, ArtistID: artist.ID, TrackNumber: 2, Audio: upload("audio/mpeg", mp3Bytes)},
	})
	if err == nil {
		t.Fatal("expected insert failure")
	}
	if e.count(t, "tracks") != 0 || len(e.store.Keys()) != 0 {
		t.Fatalf("uploaded audio not cleaned up: keys=%v deleted=%v", e.store.Keys(), e.store.Deleted)
	}
}

func failTrackInserts(t *testing.T, gdb *gorm.DB) {
	t.Helper()
	err := gdb.Callback().Create().Before("gorm:create").Register("test:fail_tracks", func(tx *gorm.DB) {
		if tx.Statement.Table == "tracks" {
			_ = tx.AddError(errors.New("insert failed"))
		}
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestUploadTrackLyricsFailureIsIgnored(t *testing.T) {
	e := newEnv(t)
	e.lyrics.err = errors.New("lrclib down")
	artist := e.artist(t, "A")
	album := e.album(t, artist, "x", 1)
	tr, err := e.catalog.UploadTrack(e.ctx, TrackInput{Title: "t", AlbumID: album.ID, ArtistID: artist.ID, Audio: upload("audio/mpeg", mp3Bytes)})
	if err != nil || tr.LrclibID != nil || tr.Hifi {
		t.Fatalf("%+v %v", tr, err)
	}
}

func TestListTracksOrderingAndSearch(t *testing.T) {
	e := newEnv(t)
	burial := e.artist(t, "Burial")
	untrue := e.album(t, burial, "Untrue", 2007)
	e.track(t, untrue, "Near Dark", 3)
	e.track(t, untrue, "Archangel", 2)
	aphex := e.artist(t, "Aphex")
	syro := e.album(t, aphex, "Syro", 2014)
	e.track(t, syro, "minipops", 1)

	byAlbum, _ := e.catalog.ListTracks(e.ctx, &untrue.ID, "", nil)
	if len(byAlbum) != 2 || byAlbum[0].Title != "Archangel" {
		t.Fatalf("track number order: %+v", byAlbum)
	}
	for q, want := range map[string]int{"archangel": 1, "burial": 2, "SYRO": 1, "zzz": 0} {
		got, _ := e.catalog.ListTracks(e.ctx, nil, q, nil)
		if len(got) != want {
			t.Errorf("query %q: %d tracks, want %d", q, len(got), want)
		}
	}
	scoped, _ := e.catalog.ListTracks(e.ctx, &untrue.ID, "near", nil)
	if len(scoped) != 1 || scoped[0].Title != "Near Dark" {
		t.Fatalf("scoped search %+v", scoped)
	}
}

func TestMostPlayed(t *testing.T) {
	e := newEnv(t)
	artist := e.artist(t, "A")
	album := e.album(t, artist, "x", 1)
	a, b, c := e.track(t, album, "a", 1), e.track(t, album, "b", 2), e.track(t, album, "c", 3)
	u := e.user(t, "u", model.RoleListener)
	for tr, n := range map[*model.Track]int{a: 1, b: 3, c: 2} {
		for range n {
			if err := e.catalog.RecordPlay(e.ctx, u.ID, tr.ID); err != nil {
				t.Fatal(err)
			}
		}
	}
	top, _ := e.catalog.MostPlayed(e.ctx, 10)
	if got := ids(top, func(t dto.Track) uuid.UUID { return t.ID }); !slices.Equal(got, []uuid.UUID{b.ID, c.ID, a.ID}) {
		t.Fatalf("order %v", got)
	}
	if top, _ := e.catalog.MostPlayed(e.ctx, 1); len(top) != 1 || top[0].ID != b.ID {
		t.Fatalf("limit %+v", top)
	}
	if top, _ := e.catalog.MostPlayed(e.ctx, 0); len(top) != 1 {
		t.Fatalf("limit 0 clamps to 1: %d", len(top))
	}
	wantAppErr(t, e.catalog.RecordPlay(e.ctx, u.ID, uuid.New()), 404, "")
}

func TestMostPlayedEmpty(t *testing.T) {
	e := newEnv(t)
	top, err := e.catalog.MostPlayed(e.ctx, 10)
	if err != nil || top == nil || len(top) != 0 {
		t.Fatalf("%v %v", top, err)
	}
}

func TestUpdateAlbumTracksValidatesOwnershipAtomically(t *testing.T) {
	e := newEnv(t)
	artist := e.artist(t, "A")
	al1, al2 := e.album(t, artist, "one", 1), e.album(t, artist, "two", 2)
	t1, t2 := e.track(t, al1, "t1", 1), e.track(t, al2, "t2", 1)
	_, err := e.catalog.UpdateAlbumTracks(e.ctx, al1.ID, []TrackUpdate{
		{ID: &t1.ID, Title: "renamed", TrackNumber: 5},
		{ID: &t2.ID, Title: "x", TrackNumber: 1},
	})
	wantAppErr(t, err, 400, "Track "+t2.ID.String()+" does not belong to album "+al1.ID.String())
	got, _ := e.catalog.GetTrack(e.ctx, t1.ID)
	if got.Title != "t1" {
		t.Fatal("partial update not rolled back")
	}
	out, err := e.catalog.UpdateAlbumTracks(e.ctx, al1.ID, []TrackUpdate{{ID: &t1.ID, Title: "renamed", TrackNumber: 5}})
	if err != nil || out[0].Title != "renamed" || out[0].TrackNumber != 5 {
		t.Fatalf("%+v %v", out, err)
	}

	missing := uuid.New()
	_, err = e.catalog.UpdateAlbumTracks(e.ctx, al1.ID, []TrackUpdate{{ID: &missing, Title: "x"}})
	wantAppErr(t, err, 404, "Track not found: "+missing.String())

	t3 := e.track(t, al1, "t3", 2)
	out, err = e.catalog.UpdateAlbumTracks(e.ctx, al1.ID, []TrackUpdate{
		{ID: &t3.ID, Title: "first", TrackNumber: 1},
		{ID: &t1.ID, Title: "second", TrackNumber: 2},
	})
	if err != nil || len(out) != 2 || out[0].ID != t3.ID || out[0].Title != "first" || out[1].ID != t1.ID || out[1].TrackNumber != 2 || out[1].Album.Artist.Name != "A" {
		t.Fatalf("batch update keeps input order and loads relations: %+v %v", out, err)
	}
	if out, err := e.catalog.UpdateAlbumTracks(e.ctx, al1.ID, nil); err != nil || out == nil || len(out) != 0 {
		t.Fatalf("empty update: %v %v", out, err)
	}
}

func TestUpdateTrackAndLrclib(t *testing.T) {
	e := newEnv(t)
	artist := e.artist(t, "A")
	tr := e.track(t, e.album(t, artist, "x", 1), "t", 1)
	got, err := e.catalog.UpdateTrack(e.ctx, tr.ID, "new", 9)
	if err != nil || got.Title != "new" || got.TrackNumber != 9 {
		t.Fatalf("%+v %v", got, err)
	}
	id := 77
	got, err = e.catalog.UpdateLrclibID(e.ctx, tr.ID, &id)
	if err != nil || *got.LrclibID != 77 {
		t.Fatalf("%+v %v", got, err)
	}
	got, err = e.catalog.UpdateLrclibID(e.ctx, tr.ID, nil)
	if err != nil || got.LrclibID != nil {
		t.Fatalf("clear lrclib: %+v %v", got, err)
	}
	missing := uuid.New()
	_, err = e.catalog.UpdateLrclibID(e.ctx, missing, &id)
	wantAppErr(t, err, 404, "Track not found: "+missing.String())
	_, err = e.catalog.UpdateTrack(e.ctx, missing, "x", 1)
	wantAppErr(t, err, 404, "Track not found: "+missing.String())
}

func TestDeleteTrack(t *testing.T) {
	e := newEnv(t)
	artist := e.artist(t, "A")
	album := e.album(t, artist, "x", 1)
	tr, _ := e.catalog.UploadTrack(e.ctx, TrackInput{Title: "t", AlbumID: album.ID, ArtistID: artist.ID, Audio: upload("audio/mpeg", mp3Bytes)})
	if err := e.catalog.DeleteTrack(e.ctx, tr.ID); err != nil {
		t.Fatal(err)
	}
	if e.count(t, "tracks") != 0 || len(e.store.Keys()) != 0 {
		t.Fatal("track or object remains")
	}
	wantAppErr(t, e.catalog.DeleteTrack(e.ctx, tr.ID), 404, "")
}

func TestRandomCoverIDsAndImageKey(t *testing.T) {
	e := newEnv(t)
	artist := e.artist(t, "A")
	withCover, _ := e.catalog.CreateAlbum(e.ctx, AlbumInput{Title: "c", ArtistID: artist.ID, ReleaseYear: 1, Cover: upload("image/png", pngBytes)})
	e.album(t, artist, "no cover", 2)
	got, _ := e.catalog.RandomCoverIDs(e.ctx, 24)
	if !slices.Equal(got, []string{withCover.ID.String()}) {
		t.Fatalf("%v", got)
	}
	key, err := e.catalog.ImageKey(e.ctx, "albums", withCover.ID)
	if err != nil || key == nil || *key != e.coverKey(t, withCover.ID) || !imageKeyLike(*key, "albums", withCover.ID, "png") {
		t.Fatalf("%v %v", key, err)
	}
	key, err = e.catalog.ImageKey(e.ctx, "artists", artist.ID)
	if err != nil || key != nil {
		t.Fatalf("artist without avatar: %v %v", key, err)
	}
	_, err = e.catalog.ImageKey(e.ctx, "artists", uuid.New())
	wantAppErr(t, err, 404, "")
}

func TestLrclibClient(t *testing.T) {
	var gotQuery, gotUA string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery, gotUA = r.URL.RawQuery, r.UserAgent()
		switch r.URL.Query().Get("track_name") {
		case "found":
			_, _ = w.Write([]byte(`{"id": 123, "plainLyrics": "..."}`))
		case "missing":
			w.WriteHeader(http.StatusNotFound)
		default:
			w.WriteHeader(http.StatusInternalServerError)
		}
	}))
	defer srv.Close()
	l := &Lrclib{BaseURL: srv.URL, Client: srv.Client()}

	id, err := l.Find(t.Context(), "found", "Sigur Rós", "( )", 300)
	if err != nil || id == nil || *id != 123 {
		t.Fatalf("%v %v", id, err)
	}
	if gotUA != lrclibUserAgent || gotQuery != "album_name=%28+%29&artist_name=Sigur+R%C3%B3s&duration=300&track_name=found" {
		t.Fatalf("ua=%q query=%q", gotUA, gotQuery)
	}
	if id, err := l.Find(t.Context(), "missing", "a", "b", 1); err != nil || id != nil {
		t.Fatalf("404: %v %v", id, err)
	}
	if _, err := l.Find(t.Context(), "boom", "a", "b", 1); err == nil {
		t.Fatal("500 should error")
	}
}
