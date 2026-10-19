-- +goose Up
ALTER TABLE party_playback_state ADD COLUMN IF NOT EXISTS queue_item_id uuid
    CONSTRAINT fk_party_playback_queue_item REFERENCES party_queue_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_party_playback_queue_item ON party_playback_state (queue_item_id);

-- +goose Down
SELECT 1;
