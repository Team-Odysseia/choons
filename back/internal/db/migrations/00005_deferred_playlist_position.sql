-- +goose Up
-- +goose StatementBegin
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT i.relname AS index_name, c.conname
        FROM pg_index x
        JOIN pg_class i ON i.oid = x.indexrelid
        LEFT JOIN pg_constraint c ON c.conindid = x.indexrelid AND c.contype = 'u'
        WHERE x.indrelid = 'playlist_tracks'::regclass
          AND x.indisunique
          AND NOT x.indisprimary
          AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
               FROM pg_attribute a
               WHERE a.attrelid = x.indrelid AND a.attnum = ANY (x.indkey::int2[])) = ARRAY['playlist_id', 'position']
    LOOP
        IF r.conname IS NOT NULL THEN
            EXECUTE format('ALTER TABLE playlist_tracks DROP CONSTRAINT %I', r.conname);
        ELSE
            EXECUTE format('DROP INDEX %I', r.index_name);
        END IF;
    END LOOP;
END $$;
-- +goose StatementEnd

ALTER TABLE playlist_tracks
    ADD CONSTRAINT playlist_tracks_playlist_position_key UNIQUE (playlist_id, position) DEFERRABLE INITIALLY DEFERRED;

-- +goose Down
SELECT 1;
