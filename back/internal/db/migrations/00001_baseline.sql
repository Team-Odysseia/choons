-- +goose Up
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    password varchar(255),
    requests_blocked boolean NOT NULL DEFAULT false,
    role varchar(255) CHECK (role IN ('LISTENER', 'ADMIN')),
    username varchar(255) UNIQUE
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS requests_blocked boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS artists (
    id uuid PRIMARY KEY,
    avatar_key varchar(255),
    bio text,
    created_at timestamp(6),
    name varchar(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS albums (
    id uuid PRIMARY KEY,
    cover_key varchar(255),
    created_at timestamp(6),
    release_year integer NOT NULL,
    title varchar(255) NOT NULL,
    artist_id uuid NOT NULL REFERENCES artists(id)
);

CREATE TABLE IF NOT EXISTS tracks (
    id uuid PRIMARY KEY,
    content_type varchar(255) NOT NULL,
    created_at timestamp(6),
    duration_seconds integer NOT NULL,
    lrclib_id integer,
    r2_key varchar(255) NOT NULL,
    title varchar(255) NOT NULL,
    track_number integer NOT NULL,
    album_id uuid NOT NULL REFERENCES albums(id),
    artist_id uuid NOT NULL REFERENCES artists(id)
);

CREATE TABLE IF NOT EXISTS playlists (
    id uuid PRIMARY KEY,
    created_at timestamp(6),
    is_public boolean NOT NULL,
    name varchar(255) NOT NULL,
    updated_at timestamp(6),
    owner_id uuid NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    id uuid PRIMARY KEY,
    position integer NOT NULL,
    playlist_id uuid NOT NULL REFERENCES playlists(id),
    track_id uuid NOT NULL REFERENCES tracks(id),
    UNIQUE (playlist_id, position)
);

CREATE TABLE IF NOT EXISTS favorites (
    id uuid PRIMARY KEY,
    favorited_at timestamp(6),
    track_id uuid NOT NULL REFERENCES tracks(id),
    user_id uuid NOT NULL REFERENCES users(id),
    UNIQUE (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS stream_events (
    id uuid PRIMARY KEY,
    played_at timestamp(6),
    track_id uuid NOT NULL REFERENCES tracks(id),
    user_id uuid NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS album_requests (
    id uuid PRIMARY KEY,
    admin_note varchar(600),
    album_name varchar(160) NOT NULL,
    artist_name varchar(160) NOT NULL,
    created_at timestamp(6),
    external_url varchar(600) NOT NULL,
    status varchar(16) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    updated_at timestamp(6),
    requester_id uuid NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS parties (
    id uuid PRIMARY KEY,
    created_at timestamp(6),
    invite_code varchar(8) NOT NULL UNIQUE,
    name varchar(120) NOT NULL,
    queue_policy varchar(16) NOT NULL CHECK (queue_policy IN ('DJ_ONLY', 'EVERYONE')),
    status varchar(16) NOT NULL CHECK (status IN ('ACTIVE', 'ENDED')),
    updated_at timestamp(6),
    host_user_id uuid NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS party_members (
    id uuid PRIMARY KEY,
    connected boolean NOT NULL,
    dj boolean NOT NULL,
    host boolean NOT NULL,
    joined_at timestamp(6),
    party_id uuid NOT NULL REFERENCES parties(id),
    user_id uuid NOT NULL REFERENCES users(id),
    UNIQUE (party_id, user_id)
);

CREATE TABLE IF NOT EXISTS party_playback_state (
    id uuid PRIMARY KEY,
    anchor_epoch_ms bigint NOT NULL,
    anchor_position_sec double precision NOT NULL,
    playing boolean NOT NULL,
    updated_at timestamp(6),
    party_id uuid NOT NULL UNIQUE REFERENCES parties(id),
    track_id uuid REFERENCES tracks(id)
);

CREATE TABLE IF NOT EXISTS party_queue_items (
    id uuid PRIMARY KEY,
    created_at timestamp(6),
    position integer NOT NULL,
    added_by_user_id uuid NOT NULL REFERENCES users(id),
    party_id uuid NOT NULL REFERENCES parties(id),
    track_id uuid NOT NULL REFERENCES tracks(id)
);

-- +goose Down
SELECT 1;
