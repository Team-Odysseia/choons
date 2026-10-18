-- +goose Up
-- +goose StatementBegin
DO $$
DECLARE
    fk record;
BEGIN
    FOR fk IN
        SELECT c.conname, t.relname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.contype = 'f'
          AND n.nspname = current_schema()
          AND t.relname IN ('albums', 'tracks', 'playlists', 'playlist_tracks', 'favorites', 'stream_events',
                            'album_requests', 'parties', 'party_members', 'party_playback_state', 'party_queue_items')
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', fk.relname, fk.conname);
    END LOOP;
END $$;
-- +goose StatementEnd

ALTER TABLE albums ADD CONSTRAINT fk_albums_artist FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;
ALTER TABLE tracks ADD CONSTRAINT fk_tracks_album FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE;
ALTER TABLE tracks ADD CONSTRAINT fk_tracks_artist FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;
ALTER TABLE playlists ADD CONSTRAINT fk_playlists_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE playlist_tracks ADD CONSTRAINT fk_playlist_tracks_playlist FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE;
ALTER TABLE playlist_tracks ADD CONSTRAINT fk_playlist_tracks_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;
ALTER TABLE stream_events ADD CONSTRAINT fk_stream_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE stream_events ADD CONSTRAINT fk_stream_events_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;
ALTER TABLE album_requests ADD CONSTRAINT fk_album_requests_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE parties ADD CONSTRAINT fk_parties_host FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE party_members ADD CONSTRAINT fk_party_members_party FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE;
ALTER TABLE party_members ADD CONSTRAINT fk_party_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE party_playback_state ADD CONSTRAINT fk_party_playback_party FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE;
ALTER TABLE party_playback_state ADD CONSTRAINT fk_party_playback_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL;
ALTER TABLE party_queue_items ADD CONSTRAINT fk_party_queue_party FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE;
ALTER TABLE party_queue_items ADD CONSTRAINT fk_party_queue_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;
ALTER TABLE party_queue_items ADD CONSTRAINT fk_party_queue_added_by FOREIGN KEY (added_by_user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums (artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks (album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks (artist_id);
CREATE INDEX IF NOT EXISTS idx_playlists_owner ON playlists (owner_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks (track_id);
CREATE INDEX IF NOT EXISTS idx_favorites_track ON favorites (track_id);
CREATE INDEX IF NOT EXISTS idx_stream_events_track ON stream_events (track_id);
CREATE INDEX IF NOT EXISTS idx_stream_events_user ON stream_events (user_id);
CREATE INDEX IF NOT EXISTS idx_album_requests_requester ON album_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_party_members_user ON party_members (user_id);
CREATE INDEX IF NOT EXISTS idx_party_queue_party ON party_queue_items (party_id);

-- +goose Down
SELECT 1;
