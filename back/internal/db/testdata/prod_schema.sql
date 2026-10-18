
CREATE TYPE public.user_role AS ENUM (
    'LISTENER',
    'ADMIN'
);

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

CREATE FUNCTION public.uuid_generate_v7() RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
unix_time_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_time_ms := decode(lpad(to_hex(floor(extract(epoch from clock_timestamp()) * 1000)::bigint), 12, '0'), 'hex');
  uuid_bytes := unix_time_ms || gen_random_bytes(10);
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;

CREATE TABLE public.album_requests (
    id uuid NOT NULL,
    admin_note character varying(600),
    album_name character varying(160) NOT NULL,
    artist_name character varying(160) NOT NULL,
    created_at timestamp(6) without time zone,
    external_url character varying(600) NOT NULL,
    status character varying(16) NOT NULL,
    updated_at timestamp(6) without time zone,
    requester_id uuid NOT NULL,
    CONSTRAINT album_requests_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('ACCEPTED'::character varying)::text, ('REJECTED'::character varying)::text])))
);

CREATE TABLE public.albums (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    title character varying(255) NOT NULL,
    cover_art_url text,
    release_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    release_year integer NOT NULL,
    artist_id uuid NOT NULL,
    cover_key character varying(255)
);

CREATE TABLE public.artist_albums (
    artist_id uuid NOT NULL,
    album_id uuid NOT NULL
);

CREATE TABLE public.artist_tracks (
    artist_id uuid NOT NULL,
    track_id uuid NOT NULL
);

CREATE TABLE public.artists (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    name character varying(255) NOT NULL,
    bio text,
    profile_picture_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_key character varying(255)
);

CREATE TABLE public.favorites (
    id uuid NOT NULL,
    favorited_at timestamp(6) without time zone,
    track_id uuid NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE public.parties (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    invite_code character varying(8) NOT NULL,
    name character varying(120) NOT NULL,
    queue_policy character varying(16) NOT NULL,
    status character varying(16) NOT NULL,
    updated_at timestamp(6) without time zone,
    host_user_id uuid NOT NULL,
    CONSTRAINT parties_queue_policy_check CHECK (((queue_policy)::text = ANY (ARRAY[('DJ_ONLY'::character varying)::text, ('EVERYONE'::character varying)::text]))),
    CONSTRAINT parties_status_check CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('ENDED'::character varying)::text])))
);

CREATE TABLE public.party_members (
    id uuid NOT NULL,
    connected boolean NOT NULL,
    dj boolean NOT NULL,
    host boolean NOT NULL,
    joined_at timestamp(6) without time zone,
    party_id uuid NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE public.party_playback_state (
    id uuid NOT NULL,
    anchor_epoch_ms bigint NOT NULL,
    anchor_position_sec double precision NOT NULL,
    playing boolean NOT NULL,
    updated_at timestamp(6) without time zone,
    party_id uuid NOT NULL,
    track_id uuid
);

CREATE TABLE public.party_queue_items (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    "position" integer NOT NULL,
    added_by_user_id uuid NOT NULL,
    party_id uuid NOT NULL,
    track_id uuid NOT NULL
);

CREATE TABLE public.playlist_tracks (
    playlist_id uuid NOT NULL,
    track_id uuid NOT NULL,
    "position" integer NOT NULL,
    added_at timestamp with time zone DEFAULT now(),
    id uuid NOT NULL
);

CREATE TABLE public.playlists (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    owner_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    avatar_url text,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    dirty boolean NOT NULL
);

CREATE TABLE public.stream_events (
    id uuid NOT NULL,
    played_at timestamp(6) without time zone,
    track_id uuid NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE public.tracks (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    album_id uuid,
    title character varying(255) NOT NULL,
    duration_seconds integer NOT NULL,
    track_number integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    content_type character varying(255) NOT NULL,
    r2_key character varying(255) NOT NULL,
    artist_id uuid NOT NULL,
    lrclib_id integer
);

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    password character varying(255),
    role character varying(255) DEFAULT 'LISTENER'::public.user_role,
    username character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    requests_blocked boolean DEFAULT false NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('LISTENER'::character varying)::text, ('ADMIN'::character varying)::text])))
);

ALTER TABLE ONLY public.album_requests
    ADD CONSTRAINT album_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.artist_albums
    ADD CONSTRAINT artist_albums_pkey PRIMARY KEY (artist_id, album_id);

ALTER TABLE ONLY public.artist_tracks
    ADD CONSTRAINT artist_tracks_pkey PRIMARY KEY (artist_id, track_id);

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.party_members
    ADD CONSTRAINT party_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.party_playback_state
    ADD CONSTRAINT party_playback_state_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.party_queue_items
    ADD CONSTRAINT party_queue_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_pkey PRIMARY KEY (playlist_id, track_id);

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);

ALTER TABLE ONLY public.stream_events
    ADD CONSTRAINT stream_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT uk3t5s5eigec1e9yj203sm7pqwv UNIQUE (user_id, track_id);

ALTER TABLE ONLY public.party_members
    ADD CONSTRAINT ukf2s0ftmqbgw7m5egwpy4yc386 UNIQUE (party_id, user_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT ukr43af9ap4edm43mmtq01oddj6 UNIQUE (username);

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT ukr8gqjvbl0t4r887lhqd41gbb3 UNIQUE (invite_code);

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT ukrw51rpaskj2ryrbpbt2tqryfu UNIQUE (playlist_id, "position");

ALTER TABLE ONLY public.party_playback_state
    ADD CONSTRAINT uktl3ibphrrmv47hbepsgl8jnq UNIQUE (party_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX idx_artist_albums_album_id ON public.artist_albums USING btree (album_id);

CREATE INDEX idx_artist_tracks_track_id ON public.artist_tracks USING btree (track_id);

CREATE UNIQUE INDEX idx_playlist_position ON public.playlist_tracks USING btree (playlist_id, "position");

CREATE INDEX idx_playlist_tracks_track_id ON public.playlist_tracks USING btree (track_id);

CREATE INDEX idx_playlists_owner_id ON public.playlists USING btree (owner_id);

CREATE INDEX idx_tracks_album_id ON public.tracks USING btree (album_id);

ALTER TABLE ONLY public.artist_albums
    ADD CONSTRAINT artist_albums_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.artist_albums
    ADD CONSTRAINT artist_albums_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.artist_tracks
    ADD CONSTRAINT artist_tracks_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.artist_tracks
    ADD CONSTRAINT artist_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.party_queue_items
    ADD CONSTRAINT fk2scr77125l7kcbdtdf35n1h8t FOREIGN KEY (track_id) REFERENCES public.tracks(id);

ALTER TABLE ONLY public.stream_events
    ADD CONSTRAINT fk3uveo8py49k0yfbfuk4axrjjl FOREIGN KEY (track_id) REFERENCES public.tracks(id);

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT fk41i9jmmtrbhotm5btko5b19k FOREIGN KEY (host_user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.party_playback_state
    ADD CONSTRAINT fk5w8d9q68spjsrjr2v5obet6j9 FOREIGN KEY (party_id) REFERENCES public.parties(id);

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT fk72gqyi6l1j674radjyitcm86f FOREIGN KEY (artist_id) REFERENCES public.artists(id);

ALTER TABLE ONLY public.party_members
    ADD CONSTRAINT fk8t7tw0lrh904ld026ludm2vm3 FOREIGN KEY (party_id) REFERENCES public.parties(id);

ALTER TABLE ONLY public.stream_events
    ADD CONSTRAINT fk9dnf2n076fcuusdgj6lu8mfhc FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.album_requests
    ADD CONSTRAINT fkdfofuk3mtx34bqdxywf162rv4 FOREIGN KEY (requester_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.party_playback_state
    ADD CONSTRAINT fkgevh2s6f79hij0jyyypty0kdp FOREIGN KEY (track_id) REFERENCES public.tracks(id);

ALTER TABLE ONLY public.party_queue_items
    ADD CONSTRAINT fkj9incqtxq87tut1fr5lqi94ip FOREIGN KEY (added_by_user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT fkk7du8b8ewipawnnpg76d55fus FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT fkkiacd31n79ksp3mnq6owsbjiu FOREIGN KEY (artist_id) REFERENCES public.artists(id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT fkl95wc4ai7byhyogfs6eb9ah8q FOREIGN KEY (track_id) REFERENCES public.tracks(id);

ALTER TABLE ONLY public.party_members
    ADD CONSTRAINT fkolpgeuo237h78okianm86vn9c FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.party_queue_items
    ADD CONSTRAINT fkpg3rq2d21v2pi66x4bp99rp8b FOREIGN KEY (party_id) REFERENCES public.parties(id);

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE CASCADE;

ALTER TABLE public.album_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.artist_albums ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.artist_tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.party_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.party_playback_state ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.party_queue_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stream_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

