-- +goose Up
CREATE INDEX IF NOT EXISTS idx_party_queue_track ON party_queue_items (track_id);
CREATE INDEX IF NOT EXISTS idx_party_queue_added_by ON party_queue_items (added_by_user_id);
CREATE INDEX IF NOT EXISTS idx_party_playback_track ON party_playback_state (track_id);
CREATE INDEX IF NOT EXISTS idx_parties_host ON parties (host_user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks (created_at, id);

-- +goose Down
SELECT 1;
