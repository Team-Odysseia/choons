-- +goose Up
ALTER TABLE parties ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;

-- +goose Down
SELECT 1;
