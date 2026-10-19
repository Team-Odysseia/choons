package db_test

import (
	"context"
	_ "embed"
	"testing"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/db"
	"github.com/Team-Odysseia/choons/back/internal/testutil/pgtest"
)

//go:embed testdata/hibernate_schema.sql
var hibernateSchema string

type column struct {
	TableName  string
	ColumnName string
	DataType   string
	IsNullable string
}

func columns(t *testing.T, gdb *gorm.DB) map[string]column {
	t.Helper()
	var rows []column
	err := gdb.Raw(`SELECT table_name, column_name, data_type, is_nullable
		FROM information_schema.columns
		WHERE table_schema = current_schema() AND table_name <> 'goose_db_version'`).Scan(&rows).Error
	if err != nil {
		t.Fatal(err)
	}
	out := make(map[string]column, len(rows))
	for _, r := range rows {
		out[r.TableName+"."+r.ColumnName] = r
	}
	return out
}

func cascadeCount(t *testing.T, gdb *gorm.DB) int64 {
	t.Helper()
	var n int64
	err := gdb.Raw(`SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND confdeltype IN ('c', 'n')
		AND conrelid::regclass::text NOT IN ('artist_albums', 'artist_tracks')`).Scan(&n).Error
	if err != nil {
		t.Fatal(err)
	}
	return n
}

var addedColumns = []string{"parties.revision", "party_playback_state.queue_item_id"}

func requireDeferredPlaylistPosition(t *testing.T, gdb *gorm.DB) {
	t.Helper()
	var uniques []struct {
		Name     string
		Deferred bool
	}
	err := gdb.Raw(`SELECT i.relname AS name, coalesce(c.condeferred, false) AS deferred
		FROM pg_index x
		JOIN pg_class i ON i.oid = x.indexrelid
		LEFT JOIN pg_constraint c ON c.conindid = x.indexrelid
		WHERE x.indrelid = 'playlist_tracks'::regclass AND x.indisunique AND NOT x.indisprimary`).Scan(&uniques).Error
	if err != nil {
		t.Fatal(err)
	}
	if len(uniques) != 1 || !uniques[0].Deferred {
		t.Fatalf("playlist position uniqueness must be a single deferred constraint: %+v", uniques)
	}
}

func requireIndexes(t *testing.T, gdb *gorm.DB) {
	t.Helper()
	want := []struct{ table, cols string }{
		{"party_queue_items", "track_id"},
		{"party_queue_items", "added_by_user_id"},
		{"party_playback_state", "track_id"},
		{"parties", "host_user_id"},
		{"tracks", "created_at,id"},
	}
	for _, w := range want {
		var n int64
		err := gdb.Raw(`SELECT count(*) FROM pg_index x
			WHERE x.indrelid = ?::regclass
			  AND (SELECT string_agg(a.attname, ',' ORDER BY k.ord)
			       FROM unnest(x.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
			       JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = k.attnum) = ?`, w.table, w.cols).Scan(&n).Error
		if err != nil {
			t.Fatal(err)
		}
		if n == 0 {
			t.Errorf("missing index on %s(%s)", w.table, w.cols)
		}
	}
}

func TestMigrateFreshMatchesHibernateSchema(t *testing.T) {
	fresh := pgtest.NewDB(t)

	legacy := pgtest.Open(t, pgtest.NewDSN(t))
	if err := legacy.Exec(hibernateSchema).Error; err != nil {
		t.Fatalf("load hibernate schema: %v", err)
	}
	want := columns(t, legacy)

	if err := db.Migrate(context.Background(), legacy); err != nil {
		t.Fatalf("migrate legacy schema: %v", err)
	}
	got := columns(t, fresh)
	for _, key := range addedColumns {
		if _, ok := got[key]; !ok {
			t.Errorf("missing added column %s", key)
		}
		delete(got, key)
	}
	if len(got) != len(want) {
		t.Fatalf("column count: fresh=%d hibernate=%d", len(got), len(want))
	}
	for key, w := range want {
		g, ok := got[key]
		if !ok {
			t.Errorf("missing column %s", key)
			continue
		}
		if g != w {
			t.Errorf("column %s: fresh=%+v hibernate=%+v", key, g, w)
		}
	}
	if n := cascadeCount(t, legacy); n != 20 {
		t.Errorf("legacy cascading FKs = %d, want 20", n)
	}
	if n := cascadeCount(t, fresh); n != 20 {
		t.Errorf("fresh cascading FKs = %d, want 20", n)
	}
	requireDeferredPlaylistPosition(t, fresh)
	requireDeferredPlaylistPosition(t, legacy)
	requireIndexes(t, fresh)
	requireIndexes(t, legacy)
}

//go:embed testdata/prod_schema.sql
var prodSchema string

func TestMigrateProductionSchema(t *testing.T) {
	gdb := pgtest.Open(t, pgtest.NewDSN(t))
	if err := gdb.Exec(`CREATE EXTENSION IF NOT EXISTS pgcrypto`).Error; err != nil {
		t.Fatal(err)
	}
	if err := gdb.Exec(prodSchema).Error; err != nil {
		t.Fatalf("load prod schema: %v", err)
	}
	for range 2 {
		if err := db.Migrate(context.Background(), gdb); err != nil {
			t.Fatalf("migrate prod schema: %v", err)
		}
	}

	var pk []string
	if err := gdb.Raw(`SELECT a.attname FROM pg_constraint c
		JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
		WHERE c.conrelid = 'playlist_tracks'::regclass AND c.contype = 'p'`).Scan(&pk).Error; err != nil {
		t.Fatal(err)
	}
	if len(pk) != 1 || pk[0] != "id" {
		t.Fatalf("playlist_tracks pk = %v, want [id]", pk)
	}
	if n := cascadeCount(t, gdb); n != 20 {
		t.Errorf("cascading FKs = %d, want 20", n)
	}
	requireDeferredPlaylistPosition(t, gdb)
	requireIndexes(t, gdb)

	user, artist, album, track, playlist := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	must := func(sql string, args ...any) {
		t.Helper()
		if err := gdb.Exec(sql, args...).Error; err != nil {
			t.Fatalf("%s: %v", sql, err)
		}
	}
	must(`INSERT INTO users (id, username, role) VALUES (?, 'u', 'LISTENER')`, user)
	must(`INSERT INTO artists (id, name) VALUES (?, 'a')`, artist)
	if err := gdb.Exec(`INSERT INTO artists (id, name) VALUES (?, 'a')`, uuid.New()).Error; err == nil {
		t.Fatal("artists.name must be unique after migration")
	}
	must(`INSERT INTO albums (id, title, release_year, artist_id) VALUES (?, 'al', 2000, ?)`, album, artist)
	must(`INSERT INTO tracks (id, title, track_number, duration_seconds, r2_key, content_type, album_id, artist_id) VALUES (?, 't', 1, 1, 'k', 'audio/mpeg', ?, ?)`, track, album, artist)
	must(`INSERT INTO playlists (id, name, is_public, owner_id) VALUES (?, 'p', false, ?)`, playlist, user)
	must(`INSERT INTO playlist_tracks (id, position, playlist_id, track_id) VALUES (?, 0, ?, ?)`, uuid.New(), playlist, track)
	must(`INSERT INTO playlist_tracks (id, position, playlist_id, track_id) VALUES (?, 1, ?, ?)`, uuid.New(), playlist, track)
	must(`DELETE FROM users WHERE id = ?`, user)
	must(`DELETE FROM artists WHERE id = ?`, artist)
}

func TestDeletingUserCascadesDependents(t *testing.T) {
	gdb := pgtest.NewDB(t)
	user, artist, album, track, playlist := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	stmts := []struct {
		sql  string
		args []any
	}{
		{`INSERT INTO users (id, username, role) VALUES (?, 'u', 'LISTENER')`, []any{user}},
		{`INSERT INTO artists (id, name) VALUES (?, 'a')`, []any{artist}},
		{`INSERT INTO albums (id, title, release_year, artist_id) VALUES (?, 'al', 2000, ?)`, []any{album, artist}},
		{`INSERT INTO tracks (id, title, track_number, duration_seconds, r2_key, content_type, album_id, artist_id) VALUES (?, 't', 1, 1, 'k', 'audio/mpeg', ?, ?)`, []any{track, album, artist}},
		{`INSERT INTO playlists (id, name, is_public, owner_id) VALUES (?, 'p', false, ?)`, []any{playlist, user}},
		{`INSERT INTO playlist_tracks (id, position, playlist_id, track_id) VALUES (?, 0, ?, ?)`, []any{uuid.New(), playlist, track}},
		{`INSERT INTO favorites (id, user_id, track_id) VALUES (?, ?, ?)`, []any{uuid.New(), user, track}},
		{`INSERT INTO stream_events (id, user_id, track_id) VALUES (?, ?, ?)`, []any{uuid.New(), user, track}},
	}
	for _, s := range stmts {
		if err := gdb.Exec(s.sql, s.args...).Error; err != nil {
			t.Fatalf("%s: %v", s.sql, err)
		}
	}
	if err := gdb.Exec(`DELETE FROM users WHERE id = ?`, user).Error; err != nil {
		t.Fatalf("delete user: %v", err)
	}
	if err := gdb.Exec(`DELETE FROM artists WHERE id = ?`, artist).Error; err != nil {
		t.Fatalf("delete artist: %v", err)
	}
	for _, table := range []string{"playlists", "playlist_tracks", "favorites", "stream_events", "albums", "tracks"} {
		var n int64
		if err := gdb.Table(table).Count(&n).Error; err != nil {
			t.Fatal(err)
		}
		if n != 0 {
			t.Errorf("%s still has %d rows", table, n)
		}
	}
}

func TestOpenSurvivesDroppedPreparedStatements(t *testing.T) {
	gdb := pgtest.NewDB(t)
	err := gdb.Connection(func(conn *gorm.DB) error {
		lookup := func() error {
			var n int64
			return conn.Raw("SELECT count(*) FROM users WHERE username = ?", "Nyffi").Scan(&n).Error
		}
		if err := lookup(); err != nil {
			return err
		}
		if err := conn.Exec("DO $$ BEGIN EXECUTE 'DEALLOCATE ALL'; END $$").Error; err != nil {
			return err
		}
		return lookup()
	})
	if err != nil {
		t.Fatalf("query after pooler dropped prepared statements: %v", err)
	}
}
