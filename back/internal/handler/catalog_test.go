package handler

import (
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

func TestCatalogJSONContract(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)
	bob := s.login("bob", model.RoleListener)

	track := bob.get("/music/tracks/" + ids.track).status(http.StatusOK).keys()
	if got := sortedKeys(track); got != "album,artist,createdAt,durationSeconds,hifi,id,lrclibId,title,trackNumber" {
		t.Fatalf("track keys %s", got)
	}
	if track["hifi"] != true || track["lrclibId"] != nil || track["trackNumber"] != float64(2) || track["durationSeconds"] != float64(238) {
		t.Fatalf("track %v", track)
	}
	album := track["album"].(map[string]any)
	if got := sortedKeys(album); got != "artist,coverUrl,createdAt,id,releaseYear,title" {
		t.Fatalf("album keys %s", got)
	}
	if album["coverUrl"] != "/media/images/albums/"+ids.album || album["releaseYear"] != float64(2007) {
		t.Fatalf("album %v", album)
	}
	artist := track["artist"].(map[string]any)
	if got := sortedKeys(artist); got != "avatarUrl,bio,createdAt,id,name" {
		t.Fatalf("artist keys %s", got)
	}
	if artist["avatarUrl"] != "/media/images/artists/"+ids.artist || artist["bio"] != "London" {
		t.Fatalf("artist %v", artist)
	}
	if !strings.HasSuffix(artist["createdAt"].(string), "Z") {
		t.Fatalf("timestamps must be RFC3339 UTC: %v", artist["createdAt"])
	}

	var list []map[string]any
	bob.get("/music/artists?query=bur").status(200).decode(&list)
	if len(list) != 1 {
		t.Fatalf("%v", list)
	}
	bob.get("/music/albums?artistId=" + ids.artist).status(200).decode(&list)
	if len(list) != 1 || list[0]["title"] != "Untrue" {
		t.Fatalf("%v", list)
	}
	bob.get("/music/tracks?albumId=" + ids.album + "&page=0&size=10").status(200).decode(&list)
	if len(list) != 1 {
		t.Fatalf("%v", list)
	}
	bob.get("/music/tracks?page=5").status(200).decode(&list)
	if list == nil || len(list) != 0 {
		t.Fatalf("out of range page must be []: %v", list)
	}
	if body := bob.get("/music/tracks?page=5").Body.String(); body != "[]" {
		t.Fatalf("empty list body %q", body)
	}
	bob.get("/music/albums?artistId=nope").errorIs(400, "Invalid artistId")
	bob.get("/music/tracks?size=abc").errorIs(400, "size must be a number")
	bob.get("/music/artists/"+ids.album).errorIs(404, "Artist not found: "+ids.album)

	bob.json(http.MethodPost, "/stream/"+ids.track+"/played", nil).status(http.StatusNoContent)
	bob.get("/music/tracks/most-played?limit=5").status(200).decode(&list)
	if len(list) != 1 || list[0]["id"] != ids.track {
		t.Fatalf("%v", list)
	}
	bob.json(http.MethodPost, "/stream/"+ids.album+"/played", nil).errorIs(404, "Track not found: "+ids.album)
}

func TestStreamRedirectsToPresignedURL(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)
	bob := s.login("bob", model.RoleListener)

	res := bob.get("/stream/" + ids.track).status(http.StatusFound)
	loc := res.Header().Get("Location")
	want := fmt.Sprintf("https://r2.test/audio/%s/%s/%s.flac?ttl=6h0m0s", ids.artist, ids.album, ids.track)
	if loc != want {
		t.Fatalf("location %q want %q", loc, want)
	}
	if res.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("cache-control %q", res.Header().Get("Cache-Control"))
	}
	bob.get("/stream/"+ids.album).errorIs(404, "Track not found: "+ids.album)

	s.h.DB.Model(&model.Track{}).Where("id = ?", ids.track).Update("r2_key", model.PendingKey)
	bob.get("/stream/"+ids.track).errorIs(404, "Track audio not available: "+ids.track)
}

func TestImages(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)

	res := s.anon().get("/media/images/albums/" + ids.album).status(http.StatusFound)
	if loc := res.Header().Get("Location"); !strings.HasPrefix(loc, "https://r2.test/images/albums/"+ids.album+"-") || !strings.Contains(loc, ".png") ||
		res.Header().Get("Cache-Control") != "private, max-age=1800" {
		t.Fatalf("%v", res.Header())
	}
	s.anon().get("/media/images/artists/" + ids.artist).status(http.StatusUnauthorized)
	admin.get("/media/images/artists/" + ids.artist).status(http.StatusFound)

	var covers []string
	res = s.anon().get("/public/covers").status(200).decode(&covers)
	if len(covers) != 1 || covers[0] != ids.album || res.Header().Get("Cache-Control") != "public, max-age=300" {
		t.Fatalf("%v %v", covers, res.Header())
	}

	admin.json(http.MethodDelete, "/admin/albums/"+ids.album+"/cover", nil).status(http.StatusNoContent)
	if res := s.anon().get("/media/images/albums/" + ids.album); res.Code != 404 || res.Body.Len() != 0 {
		t.Fatalf("no cover => 404 empty: %d %q", res.Code, res.Body.String())
	}
	s.anon().get("/media/images/albums/"+ids.artist).errorIs(404, "Album not found: "+ids.artist)
}

func TestAdminCatalogCrud(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)

	admin.multipart(http.MethodPost, "/admin/artists", field("bio", "x")).errorIs(400, "name is required")
	admin.multipart(http.MethodPost, "/admin/artists", field("name", "Burial")).errorIs(409, "Conflict with existing data")
	admin.multipart(http.MethodPost, "/admin/artists", field("name", "Bad"), filePart("avatarFile", "image/jpeg", png)).
		errorIs(400, "File content does not match claimed content type. Claimed: image/jpeg")
	admin.multipart(http.MethodPost, "/admin/albums", field("title", "x"), field("artistId", ids.artist), field("releaseYear", "soon")).
		errorIs(400, "releaseYear must be a number")
	admin.multipart(http.MethodPost, "/admin/albums", field("title", "x"), field("artistId", "nope"), field("releaseYear", "1")).
		errorIs(400, "Invalid artistId")
	admin.multipart(http.MethodPost, "/admin/tracks", field("title", "t"), field("albumId", ids.album), field("artistId", ids.artist), field("trackNumber", "1")).
		errorIs(400, "audioFile is required")
	admin.multipart(http.MethodPost, "/admin/tracks", field("title", "t"), field("albumId", ids.album), field("artistId", ids.artist),
		field("trackNumber", "1"), filePart("audioFile", "audio/mpeg", flac)).
		errorIs(400, "File content does not match claimed content type. Claimed: audio/mpeg")

	upd := admin.multipart(http.MethodPut, "/admin/artists/"+ids.artist, field("name", "Burial (UK)")).status(200).keys()
	if upd["name"] != "Burial (UK)" || upd["avatarUrl"] == nil || upd["bio"] != nil {
		t.Fatalf("update keeps avatar, clears bio when omitted: %v", upd)
	}
	admin.multipart(http.MethodPut, "/admin/albums/"+ids.album, field("title", "Untrue (Remaster)"), field("artistId", ids.artist), field("releaseYear", "2017")).
		status(200)

	var tracks []map[string]any
	admin.get("/admin/tracks?albumId=" + ids.album).status(200).decode(&tracks)
	if len(tracks) != 1 || tracks[0]["album"].(map[string]any)["title"] != "Untrue (Remaster)" {
		t.Fatalf("%v", tracks)
	}

	admin.json(http.MethodPut, "/admin/tracks/"+ids.track, map[string]any{"id": ids.track, "title": "", "trackNumber": 1}).errorIs(400, "title must not be blank")
	admin.json(http.MethodPut, "/admin/tracks/"+ids.track, map[string]any{"title": "x", "trackNumber": 1}).errorIs(400, "id must not be null")
	admin.json(http.MethodPut, "/admin/tracks/"+ids.track, map[string]any{"id": ids.track, "title": "x", "trackNumber": -1}).errorIs(400, "trackNumber must be greater than or equal to 0")
	admin.json(http.MethodPut, "/admin/tracks/"+ids.track, map[string]any{"id": ids.track, "title": "Archangel (VIP)", "trackNumber": 3}).status(200)
	admin.json(http.MethodPut, "/admin/albums/"+ids.album+"/tracks", []map[string]any{{"id": ids.track, "title": "", "trackNumber": 1}}).
		errorIs(400, "title must not be blank")
	admin.json(http.MethodPut, "/admin/albums/"+ids.album+"/tracks", []map[string]any{{"id": ids.track, "title": "A", "trackNumber": 9}}).
		status(200).decode(&tracks)
	if tracks[0]["title"] != "A" || tracks[0]["trackNumber"] != float64(9) {
		t.Fatalf("%v", tracks)
	}
	lr := admin.json(http.MethodPut, "/admin/tracks/"+ids.track+"/lrclib-id", map[string]any{"lrclibId": 99}).status(200).keys()
	if lr["lrclibId"] != float64(99) {
		t.Fatalf("%v", lr)
	}
	admin.json(http.MethodPut, "/admin/tracks/"+ids.track+"/lrclib-id", map[string]any{"lrclibId": nil}).status(200)

	admin.json(http.MethodDelete, "/admin/artists/"+ids.artist+"/avatar", nil).status(204)
	admin.json(http.MethodDelete, "/admin/tracks/"+ids.track, nil).status(204)
	admin.json(http.MethodDelete, "/admin/albums/"+ids.album, nil).status(204)
	admin.json(http.MethodDelete, "/admin/artists/"+ids.artist, nil).status(204)
	admin.json(http.MethodDelete, "/admin/artists/"+ids.artist, nil).errorIs(404, "Artist not found: "+ids.artist)
	if keys := s.store.Keys(); len(keys) != 0 {
		t.Fatalf("objects left %v", keys)
	}
}

func TestBatchUpload(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)
	var out []map[string]any
	admin.multipart(http.MethodPost, "/admin/tracks/batch",
		field("albumId", ids.album), field("artistId", ids.artist),
		field("titles", "One"), field("titles", "Two"),
		field("durations", "61"), field("durations", "62"),
		filePart("files", "audio/mpeg", mp3), filePart("files", "audio/flac", flac),
	).status(http.StatusCreated).decode(&out)
	if len(out) != 2 || out[0]["trackNumber"] != float64(1) || out[1]["trackNumber"] != float64(2) ||
		out[0]["title"] != "One" || out[1]["durationSeconds"] != float64(62) || out[0]["hifi"] != false || out[1]["hifi"] != true {
		t.Fatalf("%v", out)
	}
	admin.multipart(http.MethodPost, "/admin/tracks/batch",
		field("albumId", ids.album), field("artistId", ids.artist),
		field("titles", "One"), field("durations", "1"), field("durations", "2"),
		filePart("files", "audio/mpeg", mp3),
	).errorIs(400, "Mismatched batch upload lists: files=1 titles=1 durations=2")
	admin.multipart(http.MethodPost, "/admin/tracks/batch",
		field("albumId", ids.album), field("artistId", ids.artist),
		field("titles", "One"), field("durations", "long"),
		filePart("files", "audio/mpeg", mp3),
	).errorIs(400, "durations must be numbers")
	admin.raw(http.MethodPost, "/admin/tracks/batch", "multipart/form-data; boundary=x", strings.NewReader("garbage")).
		errorIs(400, "Malformed multipart request")
	admin.raw(http.MethodPut, "/admin/albums/"+ids.album+"/tracks", "application/json", strings.NewReader("{")).
		errorIs(400, "Malformed request body")
}

func TestAdminListenersAndRequests(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	bob := s.login("bob", model.RoleListener)
	s.login("carol", model.RoleListener)

	var listeners []map[string]any
	admin.get("/admin/listeners?query=BO").status(200).decode(&listeners)
	if len(listeners) != 1 || sortedKeys(listeners[0]) != "id,requestsBlocked,username" {
		t.Fatalf("%v", listeners)
	}
	id := bob.user.ID.String()
	admin.json(http.MethodPut, "/admin/listeners/"+id, map[string]string{"username": "carol"}).errorIs(400, "Username already in use")
	admin.json(http.MethodPut, "/admin/listeners/"+id, map[string]string{"username": ""}).errorIs(400, "username must not be blank")
	admin.json(http.MethodPut, "/admin/listeners/"+id, map[string]string{"username": "robert", "password": "newpass1"}).status(200)
	s.anon().json(http.MethodPost, "/auth/login", map[string]string{"username": "robert", "password": "newpass1"}).status(200)

	req := bob.json(http.MethodPost, "/album-requests", map[string]string{"albumName": " Untrue ", "artistName": "Burial", "externalUrl": "https://x.y/z"}).
		status(http.StatusCreated).keys()
	if sortedKeys(req) != "adminNote,albumName,artistName,createdAt,externalUrl,id,requesterId,requesterRequestsBlocked,requesterUsername,status,updatedAt" {
		t.Fatalf("request keys %s", sortedKeys(req))
	}
	if req["albumName"] != "Untrue" || req["status"] != "PENDING" || req["requesterUsername"] != "robert" {
		t.Fatalf("%v", req)
	}
	bob.json(http.MethodPost, "/album-requests", map[string]string{"albumName": "a", "artistName": "b", "externalUrl": "ftp://x"}).
		errorIs(400, "externalUrl externalUrl must be a valid http/https URL")

	reqID := req["id"].(string)
	admin.json(http.MethodPut, "/admin/album-requests/"+reqID+"/status", map[string]string{"status": "PENDING"}).errorIs(400, "Status can only be ACCEPTED or REJECTED")
	admin.json(http.MethodPut, "/admin/album-requests/"+reqID+"/status", map[string]string{}).errorIs(400, "status must not be null")
	upd := admin.json(http.MethodPut, "/admin/album-requests/"+reqID+"/status", map[string]string{"status": "ACCEPTED"}).status(200).keys()
	if upd["status"] != "ACCEPTED" {
		t.Fatalf("%v", upd)
	}
	bob.json(http.MethodDelete, "/album-requests/"+reqID, nil).errorIs(409, "Only pending requests can be deleted")

	ban := admin.json(http.MethodPut, "/admin/listeners/"+id+"/request-ban", map[string]bool{"blocked": true}).status(200).keys()
	if ban["requestsBlocked"] != true {
		t.Fatalf("%v", ban)
	}
	bob.json(http.MethodPost, "/album-requests", map[string]string{"albumName": "a", "artistName": "b", "externalUrl": "https://x"}).
		errorIs(403, "Album requests are disabled for this user")
	var all []map[string]any
	admin.get("/admin/album-requests").status(200).decode(&all)
	if len(all) != 1 || all[0]["requesterRequestsBlocked"] != true {
		t.Fatalf("%v", all)
	}

	admin.json(http.MethodDelete, "/admin/listeners/"+id, nil).status(204)
	admin.json(http.MethodDelete, "/admin/listeners/"+id, nil).errorIs(404, "Listener not found: "+id)
	bob.get("/auth/me").status(http.StatusUnauthorized)
}
