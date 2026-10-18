package model_test

import (
	"sync"
	"testing"

	"github.com/google/uuid"
	"gorm.io/gorm/schema"

	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/testutil/pgtest"
)

func TestEveryModelFieldMapsToExistingColumn(t *testing.T) {
	gdb := pgtest.NewDB(t)
	var rows []struct {
		TableName  string
		ColumnName string
	}
	if err := gdb.Raw(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()`).Scan(&rows).Error; err != nil {
		t.Fatal(err)
	}
	existing := map[string]bool{}
	for _, r := range rows {
		existing[r.TableName+"."+r.ColumnName] = true
	}
	models := []any{
		&model.User{}, &model.Artist{}, &model.Album{}, &model.Track{}, &model.Playlist{}, &model.PlaylistTrack{},
		&model.Favorite{}, &model.StreamEvent{}, &model.AlbumRequest{}, &model.Party{}, &model.PartyMember{},
		&model.PartyPlaybackState{}, &model.PartyQueueItem{},
	}
	cache := &sync.Map{}
	for _, m := range models {
		s, err := schema.Parse(m, cache, gdb.NamingStrategy)
		if err != nil {
			t.Fatal(err)
		}
		for _, f := range s.Fields {
			if f.DBName == "" {
				continue
			}
			if !existing[s.Table+"."+f.DBName] {
				t.Errorf("%s.%s (field %s) not in schema", s.Table, f.DBName, f.Name)
			}
		}
	}
}

func TestCreateAssignsUUIDv7AndTimestamps(t *testing.T) {
	gdb := pgtest.NewDB(t)
	a := model.Artist{Name: "Boards of Canada"}
	if err := gdb.Create(&a).Error; err != nil {
		t.Fatal(err)
	}
	if a.ID.Version() != 7 {
		t.Fatalf("id version %d", a.ID.Version())
	}
	if a.CreatedAt.IsZero() {
		t.Fatal("created_at not set")
	}
	fixed := uuid.New()
	b := model.Artist{Base: model.Base{ID: fixed}, Name: "Other"}
	if err := gdb.Create(&b).Error; err != nil {
		t.Fatal(err)
	}
	if b.ID != fixed {
		t.Fatal("preset id overwritten")
	}
	var loaded model.Artist
	if err := gdb.First(&loaded, "id = ?", a.ID).Error; err != nil {
		t.Fatal(err)
	}
	if loaded.Name != a.Name || loaded.Bio != nil {
		t.Fatalf("loaded %+v", loaded)
	}
}
