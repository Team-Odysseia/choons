package handler

import (
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

func TestPlaylistEndpoints(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)
	bob := s.login("bob", model.RoleListener)
	amy := s.login("amy", model.RoleListener)

	bob.json(http.MethodPost, "/playlists", map[string]string{"name": ""}).errorIs(400, "name must not be blank")
	bob.json(http.MethodPost, "/playlists", map[string]string{"name": strings.Repeat("x", 121)}).errorIs(400, "name size must be between 0 and 120")
	p := bob.json(http.MethodPost, "/playlists", map[string]string{"name": "Night bus"}).status(http.StatusCreated).keys()
	if sortedKeys(p) != "createdAt,id,isPublic,name,ownerId,tracks,updatedAt" || p["isPublic"] != false {
		t.Fatalf("%v", p)
	}
	id := p["id"].(string)
	bob.json(http.MethodPost, "/playlists/"+id+"/tracks", map[string]any{}).errorIs(400, "trackId must not be null")
	p = bob.json(http.MethodPost, "/playlists/"+id+"/tracks", map[string]string{"trackId": ids.track}).status(http.StatusOK).keys()
	if len(p["tracks"].([]any)) != 1 {
		t.Fatalf("%v", p)
	}
	bob.json(http.MethodPost, "/playlists/"+id+"/tracks", map[string]string{"trackId": ids.track}).errorIs(409, "Track already in playlist")
	amy.get("/playlists/"+id).errorIs(403, "Access denied")
	bob.json(http.MethodPut, "/playlists/"+id+"/visibility", map[string]bool{"isPublic": true}).status(200)
	amy.get("/playlists/" + id).status(200)

	var summaries []map[string]any
	amy.get("/playlists/public").status(200).decode(&summaries)
	if len(summaries) != 1 || sortedKeys(summaries[0]) != "id,isPublic,name,trackCount,updatedAt" || summaries[0]["trackCount"] != float64(1) {
		t.Fatalf("%v", summaries)
	}
	bob.get("/playlists").status(200).decode(&summaries)
	if len(summaries) != 1 {
		t.Fatalf("%v", summaries)
	}

	bob.json(http.MethodPut, "/playlists/"+id+"/tracks/order", map[string]any{"orderedTrackIds": []string{}}).errorIs(400, "orderedTrackIds must not be empty")
	bob.json(http.MethodPut, "/playlists/"+id+"/tracks/order", map[string]any{"orderedTrackIds": []string{ids.track, ids.track}}).errorIs(400, "Reorder list size mismatch")
	bob.json(http.MethodPut, "/playlists/"+id+"/tracks/order", map[string]any{"orderedTrackIds": []string{ids.track}}).status(200)

	bob.json(http.MethodDelete, "/playlists/"+id+"/tracks/"+ids.track, nil).status(200)
	amy.json(http.MethodDelete, "/playlists/"+id, nil).errorIs(403, "Access denied")
	bob.json(http.MethodDelete, "/playlists/"+id, nil).status(204)
	bob.get("/playlists/"+id).errorIs(404, "Playlist not found: "+id)
}

func TestFavoriteEndpoints(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)
	bob := s.login("bob", model.RoleListener)

	tr := bob.json(http.MethodPost, "/favorites/"+ids.track, nil).status(http.StatusCreated).keys()
	if tr["id"] != ids.track {
		t.Fatalf("%v", tr)
	}
	bob.json(http.MethodPost, "/favorites/"+ids.track, nil).status(http.StatusCreated)
	bob.json(http.MethodPost, "/favorites/"+ids.album, nil).errorIs(404, "Track not found: "+ids.album)

	var favs []map[string]any
	bob.get("/favorites").status(200).decode(&favs)
	if len(favs) != 1 || sortedKeys(favs[0]) != "favoritedAt,track" {
		t.Fatalf("%v", favs)
	}

	other := uuid.NewString()
	var checked []string
	bob.get(fmt.Sprintf("/favorites/check?trackIds=%s,%s", ids.track, other)).status(200).decode(&checked)
	if len(checked) != 1 || checked[0] != ids.track {
		t.Fatalf("comma form %v", checked)
	}
	bob.get(fmt.Sprintf("/favorites/check?trackIds=%s&trackIds=%s", other, ids.track)).status(200).decode(&checked)
	if len(checked) != 1 {
		t.Fatalf("repeated form %v", checked)
	}
	if body := bob.get("/favorites/check").status(200).Body.String(); body != "[]" {
		t.Fatalf("empty check %q", body)
	}
	many := make([]string, 501)
	for i := range many {
		many[i] = uuid.NewString()
	}
	bob.get("/favorites/check?trackIds="+strings.Join(many, ",")).errorIs(400, "trackIds size must be between 0 and 500")
	bob.get("/favorites/check?trackIds=nope").errorIs(400, "Invalid trackIds")

	bob.json(http.MethodDelete, "/favorites/"+ids.track, nil).status(204)
	bob.json(http.MethodDelete, "/favorites/"+ids.track, nil).status(204)
}
