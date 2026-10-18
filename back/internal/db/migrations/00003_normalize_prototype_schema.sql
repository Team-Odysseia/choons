-- +goose Up
-- +goose StatementBegin
DO $$
DECLARE
    pk_name text;
    pk_cols text[];
BEGIN
    SELECT c.conname, array_agg(a.attname::text ORDER BY a.attname)
    INTO pk_name, pk_cols
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'playlist_tracks'::regclass AND c.contype = 'p'
    GROUP BY c.conname;

    IF pk_cols IS DISTINCT FROM ARRAY['id'] THEN
        IF pk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE playlist_tracks DROP CONSTRAINT %I', pk_name);
        END IF;
        ALTER TABLE playlist_tracks ADD CONSTRAINT playlist_tracks_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
        WHERE i.indrelid = 'artists'::regclass AND i.indisunique AND i.indnatts = 1 AND a.attname = 'name'
    ) THEN
        IF EXISTS (SELECT 1 FROM artists GROUP BY name HAVING count(*) > 1) THEN
            RAISE NOTICE 'artists.name has duplicates; unique constraint not added';
        ELSE
            ALTER TABLE artists ADD CONSTRAINT artists_name_key UNIQUE (name);
        END IF;
    END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
SELECT 1;
