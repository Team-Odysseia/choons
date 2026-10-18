
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
    CONSTRAINT album_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying])::text[])))
);

CREATE TABLE public.albums (
    id uuid NOT NULL,
    cover_key character varying(255),
    created_at timestamp(6) without time zone,
    release_year integer NOT NULL,
    title character varying(255) NOT NULL,
    artist_id uuid NOT NULL
);

CREATE TABLE public.artists (
    id uuid NOT NULL,
    avatar_key character varying(255),
    bio text,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL
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
    CONSTRAINT parties_queue_policy_check CHECK (((queue_policy)::text = ANY ((ARRAY['DJ_ONLY'::character varying, 'EVERYONE'::character varying])::text[]))),
    CONSTRAINT parties_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ENDED'::character varying])::text[])))
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
    id uuid NOT NULL,
    "position" integer NOT NULL,
    playlist_id uuid NOT NULL,
    track_id uuid NOT NULL
);

CREATE TABLE public.playlists (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    is_public boolean NOT NULL,
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    owner_id uuid NOT NULL
);

CREATE TABLE public.stream_events (
    id uuid NOT NULL,
    played_at timestamp(6) without time zone,
    track_id uuid NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE public.tracks (
    id uuid NOT NULL,
    content_type character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    duration_seconds integer NOT NULL,
    lrclib_id integer,
    r2_key character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    track_number integer NOT NULL,
    album_id uuid NOT NULL,
    artist_id uuid NOT NULL
);

CREATE TABLE public.users (
    id uuid NOT NULL,
    password character varying(255),
    requests_blocked boolean NOT NULL,
    role character varying(255),
    username character varying(255),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['LISTENER'::character varying, 'ADMIN'::character varying])::text[])))
);

ALTER TABLE ONLY public.album_requests
    ADD CONSTRAINT album_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_pkey PRIMARY KEY (id);

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
    ADD CONSTRAINT playlist_tracks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);

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

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT uks2uno1rfqbsn8cs67rhdw6psn UNIQUE (name);

ALTER TABLE ONLY public.party_playback_state
    ADD CONSTRAINT uktl3ibphrrmv47hbepsgl8jnq UNIQUE (party_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

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

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT fkdcmijveo7n1lql01vav1u2jd2 FOREIGN KEY (album_id) REFERENCES public.albums(id);

ALTER TABLE ONLY public.album_requests
    ADD CONSTRAINT fkdfofuk3mtx34bqdxywf162rv4 FOREIGN KEY (requester_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.party_playback_state
    ADD CONSTRAINT fkgevh2s6f79hij0jyyypty0kdp FOREIGN KEY (track_id) REFERENCES public.tracks(id);

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT fkhjkawu4qwjhxcpveah0pymuct FOREIGN KEY (track_id) REFERENCES public.tracks(id);

ALTER TABLE ONLY public.party_queue_items
    ADD CONSTRAINT fkj9incqtxq87tut1fr5lqi94ip FOREIGN KEY (added_by_user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT fkk7du8b8ewipawnnpg76d55fus FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT fkkiacd31n79ksp3mnq6owsbjiu FOREIGN KEY (artist_id) REFERENCES public.artists(id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT fkl95wc4ai7byhyogfs6eb9ah8q FOREIGN KEY (track_id) REFERENCES public.tracks(id);

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT fkn0r1rrm19f8j7wfl656bd9sus FOREIGN KEY (owner_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT fkn9g4py06v2tmrisjdvxvjeb7x FOREIGN KEY (playlist_id) REFERENCES public.playlists(id);

ALTER TABLE ONLY public.party_members
    ADD CONSTRAINT fkolpgeuo237h78okianm86vn9c FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.party_queue_items
    ADD CONSTRAINT fkpg3rq2d21v2pi66x4bp99rp8b FOREIGN KEY (party_id) REFERENCES public.parties(id);


