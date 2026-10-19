package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
	"github.com/Team-Odysseia/choons/back/internal/dto"
	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/storage"
)

type LyricsFinder interface {
	Find(ctx context.Context, title, artist, album string, durationSeconds int) (*int, error)
}

const (
	mostPlayedTTL   = 5 * time.Minute
	mostPlayedLimit = 100
	lyricsWorkers   = 4
)

type ranking struct {
	mu  sync.Mutex
	ids []uuid.UUID
	at  time.Time
}

type Catalog struct {
	db         *gorm.DB
	store      storage.Storage
	lyrics     LyricsFinder
	async      func(func())
	now        func() time.Time
	mostPlayed ranking
}

func NewCatalog(gdb *gorm.DB, store storage.Storage, lyrics LyricsFinder) *Catalog {
	return &Catalog{db: gdb, store: store, lyrics: lyrics, async: bounded(lyricsWorkers), now: time.Now}
}

func bounded(workers int) func(func()) {
	slots := make(chan struct{}, workers)
	return func(f func()) {
		go func() {
			slots <- struct{}{}
			defer func() { <-slots }()
			f()
		}()
	}
}

func (s *Catalog) SetAsync(run func(func())) { s.async = run }

type Page struct {
	Page int
	Size int
}

const maxPageSize = 200

func (p Page) limitOffset() (int, int) {
	size := min(max(p.Size, 1), maxPageSize)
	page := min(max(p.Page, 0), 1_000_000)
	return size, page * size
}

func likePattern(q string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return "%" + r.Replace(strings.ToLower(strings.TrimSpace(q))) + "%"
}

func notFound(kind string, id uuid.UUID) error {
	return apperr.NotFound("%s not found: %s", kind, id)
}

func first[T any](tx *gorm.DB, kind string, id uuid.UUID) (*T, error) {
	var out T
	err := tx.First(&out, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, notFound(kind, id)
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func tracksQuery(tx *gorm.DB) *gorm.DB {
	return tx.Preload("Album.Artist").Preload("Artist")
}

// Artists

func (s *Catalog) ListArtists(ctx context.Context, query string, p *Page) ([]dto.Artist, error) {
	q := s.db.WithContext(ctx).Order("name ASC").Order("id ASC")
	if strings.TrimSpace(query) != "" {
		q = q.Where("lower(name) LIKE ?", likePattern(query))
	}
	if p != nil {
		limit, offset := p.limitOffset()
		q = q.Limit(limit).Offset(offset)
	}
	var artists []model.Artist
	if err := q.Find(&artists).Error; err != nil {
		return nil, err
	}
	return dto.Map(artists, dto.FromArtist), nil
}

func (s *Catalog) GetArtist(ctx context.Context, id uuid.UUID) (dto.Artist, error) {
	a, err := first[model.Artist](s.db.WithContext(ctx), "Artist", id)
	if err != nil {
		return dto.Artist{}, err
	}
	return dto.FromArtist(a), nil
}

type ArtistInput struct {
	Name   string
	Bio    *string
	Avatar *Upload
}

func (s *Catalog) CreateArtist(ctx context.Context, in ArtistInput) (dto.Artist, error) {
	img, err := prepareImage(in.Avatar)
	if err != nil {
		return dto.Artist{}, err
	}
	defer img.close()
	artist := model.Artist{Base: model.Base{ID: newID()}, Name: in.Name, Bio: in.Bio}
	err = withUploads(ctx, s.db, s.store, func(up *uploads) error {
		if img == nil {
			return nil
		}
		key := imageKey("artists", artist.ID, img.ext)
		artist.AvatarKey = &key
		return up.put(ctx, key, img)
	}, func(tx *gorm.DB) error {
		return tx.Create(&artist).Error
	})
	if err != nil {
		return dto.Artist{}, err
	}
	return dto.FromArtist(&artist), nil
}

func (s *Catalog) UpdateArtist(ctx context.Context, id uuid.UUID, in ArtistInput) (dto.Artist, error) {
	img, err := prepareImage(in.Avatar)
	if err != nil {
		return dto.Artist{}, err
	}
	defer img.close()
	if _, err := first[model.Artist](s.db.WithContext(ctx).Select("id"), "Artist", id); err != nil {
		return dto.Artist{}, err
	}
	var artist *model.Artist
	var newKey, stale string
	err = withUploads(ctx, s.db, s.store, func(up *uploads) error {
		if img == nil {
			return nil
		}
		newKey = imageKey("artists", id, img.ext)
		return up.put(ctx, newKey, img)
	}, func(tx *gorm.DB) error {
		a, err := first[model.Artist](tx.Clauses(lockForUpdate()), "Artist", id)
		if err != nil {
			return err
		}
		artist = a
		artist.Name, artist.Bio = in.Name, in.Bio
		if newKey != "" {
			if artist.AvatarKey != nil {
				stale = *artist.AvatarKey
			}
			artist.AvatarKey = &newKey
		}
		return tx.Model(artist).Select("name", "bio", "avatar_key").Updates(artist).Error
	})
	if err != nil {
		return dto.Artist{}, err
	}
	deleteObjects(ctx, s.store, []string{stale})
	return dto.FromArtist(artist), nil
}

func (s *Catalog) DeleteArtist(ctx context.Context, id uuid.UUID) error {
	var keys []string
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		artist, err := first[model.Artist](tx, "Artist", id)
		if err != nil {
			return err
		}
		if artist.AvatarKey != nil {
			keys = append(keys, *artist.AvatarKey)
		}
		var covers []string
		if err := tx.Model(&model.Album{}).Where("artist_id = ? AND cover_key IS NOT NULL", id).Pluck("cover_key", &covers).Error; err != nil {
			return err
		}
		var audio []string
		if err := tx.Model(&model.Track{}).
			Where("(artist_id = ? OR album_id IN (SELECT id FROM albums WHERE artist_id = ?)) AND r2_key <> ?", id, id, model.PendingKey).
			Pluck("r2_key", &audio).Error; err != nil {
			return err
		}
		keys = append(append(keys, covers...), audio...)
		return tx.Delete(&model.Artist{}, "id = ?", id).Error
	})
	if err != nil {
		return err
	}
	deleteObjects(ctx, s.store, keys)
	return nil
}

func (s *Catalog) DeleteArtistAvatar(ctx context.Context, id uuid.UUID) error {
	var key string
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		a, err := first[model.Artist](tx, "Artist", id)
		if err != nil || a.AvatarKey == nil {
			return err
		}
		key = *a.AvatarKey
		return tx.Model(a).Update("avatar_key", nil).Error
	})
	if err != nil {
		return err
	}
	deleteObjects(ctx, s.store, []string{key})
	return nil
}

// Albums

func (s *Catalog) ListAlbums(ctx context.Context, artistID *uuid.UUID, query string, recent bool, p *Page) ([]dto.Album, error) {
	q := s.db.WithContext(ctx).Joins("Artist")
	if artistID != nil {
		q = q.Where("albums.artist_id = ?", *artistID)
	}
	switch {
	case recent:
		q = q.Order("albums.created_at DESC").Order("albums.id DESC")
	case artistID != nil:
		q = q.Order("albums.release_year DESC").Order("albums.id ASC")
	default:
		q = q.Order(`"Artist".name ASC`).Order("albums.title ASC").Order("albums.id ASC")
	}
	if strings.TrimSpace(query) != "" {
		pat := likePattern(query)
		q = q.Where(`(lower(albums.title) LIKE ? OR lower("Artist".name) LIKE ?)`, pat, pat)
	}
	if p != nil {
		limit, offset := p.limitOffset()
		q = q.Limit(limit).Offset(offset)
	}
	var albums []model.Album
	if err := q.Find(&albums).Error; err != nil {
		return nil, err
	}
	return dto.Map(albums, dto.FromAlbum), nil
}

func (s *Catalog) GetAlbum(ctx context.Context, id uuid.UUID) (dto.Album, error) {
	a, err := first[model.Album](s.db.WithContext(ctx).Preload("Artist"), "Album", id)
	if err != nil {
		return dto.Album{}, err
	}
	return dto.FromAlbum(a), nil
}

type AlbumInput struct {
	Title       string
	ArtistID    uuid.UUID
	ReleaseYear int
	Cover       *Upload
}

func (s *Catalog) CreateAlbum(ctx context.Context, in AlbumInput) (dto.Album, error) {
	img, err := prepareImage(in.Cover)
	if err != nil {
		return dto.Album{}, err
	}
	defer img.close()
	artist, err := first[model.Artist](s.db.WithContext(ctx), "Artist", in.ArtistID)
	if err != nil {
		return dto.Album{}, err
	}
	album := model.Album{Base: model.Base{ID: newID()}, Title: in.Title, ArtistID: in.ArtistID, ReleaseYear: in.ReleaseYear}
	err = withUploads(ctx, s.db, s.store, func(up *uploads) error {
		if img == nil {
			return nil
		}
		key := imageKey("albums", album.ID, img.ext)
		album.CoverKey = &key
		return up.put(ctx, key, img)
	}, func(tx *gorm.DB) error {
		return tx.Omit("Artist").Create(&album).Error
	})
	if err != nil {
		return dto.Album{}, err
	}
	album.Artist = artist
	return dto.FromAlbum(&album), nil
}

func (s *Catalog) UpdateAlbum(ctx context.Context, id uuid.UUID, in AlbumInput) (dto.Album, error) {
	img, err := prepareImage(in.Cover)
	if err != nil {
		return dto.Album{}, err
	}
	defer img.close()
	if _, err := first[model.Album](s.db.WithContext(ctx).Select("id"), "Album", id); err != nil {
		return dto.Album{}, err
	}
	artist, err := first[model.Artist](s.db.WithContext(ctx), "Artist", in.ArtistID)
	if err != nil {
		return dto.Album{}, err
	}
	var album *model.Album
	var newKey, stale string
	err = withUploads(ctx, s.db, s.store, func(up *uploads) error {
		if img == nil {
			return nil
		}
		newKey = imageKey("albums", id, img.ext)
		return up.put(ctx, newKey, img)
	}, func(tx *gorm.DB) error {
		a, err := first[model.Album](tx.Clauses(lockForUpdate()), "Album", id)
		if err != nil {
			return err
		}
		album = a
		album.Title, album.ArtistID, album.ReleaseYear = in.Title, in.ArtistID, in.ReleaseYear
		if newKey != "" {
			if album.CoverKey != nil {
				stale = *album.CoverKey
			}
			album.CoverKey = &newKey
		}
		return tx.Model(album).Select("title", "artist_id", "release_year", "cover_key").Updates(album).Error
	})
	if err != nil {
		return dto.Album{}, err
	}
	deleteObjects(ctx, s.store, []string{stale})
	album.Artist = artist
	return dto.FromAlbum(album), nil
}

func (s *Catalog) DeleteAlbum(ctx context.Context, id uuid.UUID) error {
	var keys []string
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		album, err := first[model.Album](tx, "Album", id)
		if err != nil {
			return err
		}
		if album.CoverKey != nil {
			keys = append(keys, *album.CoverKey)
		}
		var audio []string
		if err := tx.Model(&model.Track{}).Where("album_id = ? AND r2_key <> ?", id, model.PendingKey).Pluck("r2_key", &audio).Error; err != nil {
			return err
		}
		keys = append(keys, audio...)
		return tx.Delete(&model.Album{}, "id = ?", id).Error
	})
	if err != nil {
		return err
	}
	deleteObjects(ctx, s.store, keys)
	return nil
}

func (s *Catalog) DeleteAlbumCover(ctx context.Context, id uuid.UUID) error {
	var key string
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		a, err := first[model.Album](tx, "Album", id)
		if err != nil || a.CoverKey == nil {
			return err
		}
		key = *a.CoverKey
		return tx.Model(a).Update("cover_key", nil).Error
	})
	if err != nil {
		return err
	}
	deleteObjects(ctx, s.store, []string{key})
	return nil
}

func (s *Catalog) RandomCoverIDs(ctx context.Context, n int) ([]string, error) {
	ids := []string{}
	err := s.db.WithContext(ctx).Model(&model.Album{}).Where("cover_key IS NOT NULL").
		Order("random()").Limit(n).Pluck("id::text", &ids).Error
	return ids, err
}

// Tracks

func (s *Catalog) ListTracks(ctx context.Context, albumID *uuid.UUID, query string, p *Page) ([]dto.Track, error) {
	q := tracksQuery(s.db.WithContext(ctx))
	if albumID != nil {
		q = q.Where("tracks.album_id = ?", *albumID).Order("tracks.track_number ASC").Order("tracks.id ASC")
	} else {
		q = q.Order("tracks.created_at ASC").Order("tracks.id ASC")
	}
	if strings.TrimSpace(query) != "" {
		pat := likePattern(query)
		q = q.Where(`(lower(tracks.title) LIKE ?
			OR EXISTS (SELECT 1 FROM artists ar WHERE ar.id = tracks.artist_id AND lower(ar.name) LIKE ?)
			OR EXISTS (SELECT 1 FROM albums al WHERE al.id = tracks.album_id AND lower(al.title) LIKE ?))`, pat, pat, pat)
	}
	if p != nil {
		limit, offset := p.limitOffset()
		q = q.Limit(limit).Offset(offset)
	}
	var tracks []model.Track
	if err := q.Find(&tracks).Error; err != nil {
		return nil, err
	}
	return dto.Map(tracks, dto.FromTrack), nil
}

func (s *Catalog) GetTrack(ctx context.Context, id uuid.UUID) (dto.Track, error) {
	t, err := first[model.Track](tracksQuery(s.db.WithContext(ctx)), "Track", id)
	if err != nil {
		return dto.Track{}, err
	}
	return dto.FromTrack(t), nil
}

func (s *Catalog) TrackKey(ctx context.Context, id uuid.UUID) (string, error) {
	t, err := first[model.Track](s.db.WithContext(ctx).Select("id", "r2_key"), "Track", id)
	if err != nil {
		return "", err
	}
	return t.R2Key, nil
}

func (s *Catalog) MostPlayed(ctx context.Context, limit int) ([]dto.Track, error) {
	limit = min(max(limit, 1), mostPlayedLimit)
	ranked, err := s.rankedTrackIDs(ctx)
	if err != nil || len(ranked) == 0 {
		return []dto.Track{}, err
	}
	byID, err := s.tracksByID(ctx, ranked)
	if err != nil {
		return nil, err
	}
	out := make([]dto.Track, 0, limit)
	for _, id := range ranked {
		if t, ok := byID[id]; ok && len(out) < limit {
			out = append(out, dto.FromTrack(t))
		}
	}
	return out, nil
}

func (s *Catalog) rankedTrackIDs(ctx context.Context) ([]uuid.UUID, error) {
	r := &s.mostPlayed
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.ids != nil && s.now().Sub(r.at) < mostPlayedTTL {
		return r.ids, nil
	}
	ids := []uuid.UUID{}
	err := s.db.WithContext(ctx).Model(&model.StreamEvent{}).
		Group("track_id").Order("count(*) DESC").Order("track_id ASC").Limit(mostPlayedLimit).
		Pluck("track_id", &ids).Error
	if err != nil {
		return nil, err
	}
	r.ids, r.at = ids, s.now()
	return ids, nil
}

func (s *Catalog) RecordPlay(ctx context.Context, userID, trackID uuid.UUID) error {
	err := s.db.WithContext(ctx).Create(&model.StreamEvent{UserID: userID, TrackID: trackID}).Error
	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return notFound("Track", trackID)
	}
	return err
}

type TrackInput struct {
	Title           string
	AlbumID         uuid.UUID
	ArtistID        uuid.UUID
	TrackNumber     int
	DurationSeconds int
	Audio           *Upload
}

func (s *Catalog) UploadTrack(ctx context.Context, in TrackInput) (dto.Track, error) {
	out, err := s.UploadTracks(ctx, []TrackInput{in})
	if err != nil {
		return dto.Track{}, err
	}
	return out[0], nil
}

func (s *Catalog) UploadTracks(ctx context.Context, inputs []TrackInput) ([]dto.Track, error) {
	files := make([]*prepared, len(inputs))
	defer func() {
		for _, f := range files {
			f.close()
		}
	}()
	for i := range inputs {
		if inputs[i].Audio == nil {
			return nil, apperr.BadRequest("audioFile is required")
		}
		p, err := prepare(inputs[i].Audio, storage.AudioExt)
		if err != nil {
			return nil, err
		}
		files[i] = p
	}
	albums := map[uuid.UUID]*model.Album{}
	artists := map[uuid.UUID]*model.Artist{}
	tracks := make([]model.Track, len(inputs))
	for i, in := range inputs {
		if albums[in.AlbumID] == nil {
			album, err := first[model.Album](s.db.WithContext(ctx).Preload("Artist"), "Album", in.AlbumID)
			if err != nil {
				return nil, err
			}
			albums[in.AlbumID] = album
		}
		if artists[in.ArtistID] == nil {
			artist, err := first[model.Artist](s.db.WithContext(ctx), "Artist", in.ArtistID)
			if err != nil {
				return nil, err
			}
			artists[in.ArtistID] = artist
		}
		id := newID()
		tracks[i] = model.Track{
			Base: model.Base{ID: id}, Title: in.Title, AlbumID: in.AlbumID, ArtistID: in.ArtistID,
			TrackNumber: in.TrackNumber, DurationSeconds: in.DurationSeconds, ContentType: in.Audio.ContentType,
			R2Key: fmt.Sprintf("audio/%s/%s/%s.%s", in.ArtistID, in.AlbumID, id, files[i].ext),
		}
	}
	err := withUploads(ctx, s.db, s.store, func(up *uploads) error {
		for i := range tracks {
			if err := up.put(ctx, tracks[i].R2Key, files[i]); err != nil {
				return err
			}
		}
		return nil
	}, func(tx *gorm.DB) error {
		return tx.Omit("Album", "Artist").Create(&tracks).Error
	})
	if err != nil {
		return nil, err
	}
	for i := range tracks {
		t := &tracks[i]
		t.Album, t.Artist = albums[t.AlbumID], artists[t.ArtistID]
		s.async(func() { s.matchLyrics(t.ID, t.Title, t.Artist.Name, t.Album.Title, t.DurationSeconds) })
	}
	return dto.Map(tracks, dto.FromTrack), nil
}

func (s *Catalog) matchLyrics(trackID uuid.UUID, title, artist, album string, duration int) {
	if s.lyrics == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	id, err := s.lyrics.Find(ctx, title, artist, album, duration)
	if err != nil {
		slog.Warn("lyrics lookup failed", "title", title, "err", err)
		return
	}
	if id == nil {
		return
	}
	if err := s.db.WithContext(ctx).Model(&model.Track{}).Where("id = ?", trackID).Update("lrclib_id", *id).Error; err != nil {
		slog.Warn("lyrics save failed", "track", trackID, "err", err)
	}
}

type TrackUpdate struct {
	ID          *uuid.UUID `json:"id" binding:"required"`
	Title       string     `json:"title" binding:"notblank"`
	TrackNumber int        `json:"trackNumber" binding:"gte=0"`
}

func (s *Catalog) UpdateTrack(ctx context.Context, id uuid.UUID, title string, trackNumber int) (dto.Track, error) {
	res := s.db.WithContext(ctx).Model(&model.Track{}).Where("id = ?", id).
		Updates(map[string]any{"title": title, "track_number": trackNumber})
	if res.Error != nil {
		return dto.Track{}, res.Error
	}
	if res.RowsAffected == 0 {
		return dto.Track{}, notFound("Track", id)
	}
	return s.GetTrack(ctx, id)
}

func (s *Catalog) UpdateAlbumTracks(ctx context.Context, albumID uuid.UUID, updates []TrackUpdate) ([]dto.Track, error) {
	if len(updates) == 0 {
		return []dto.Track{}, nil
	}
	latest := make(map[uuid.UUID]TrackUpdate, len(updates))
	ids := make([]uuid.UUID, 0, len(updates))
	for _, u := range updates {
		if _, seen := latest[*u.ID]; !seen {
			ids = append(ids, *u.ID)
		}
		latest[*u.ID] = u
	}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var owners []struct {
			ID      uuid.UUID
			AlbumID uuid.UUID
		}
		if err := tx.Model(&model.Track{}).Select("id", "album_id").Where("id IN ?", ids).Scan(&owners).Error; err != nil {
			return err
		}
		albumOf := make(map[uuid.UUID]uuid.UUID, len(owners))
		for _, o := range owners {
			albumOf[o.ID] = o.AlbumID
		}
		for _, u := range updates {
			owner, ok := albumOf[*u.ID]
			if !ok {
				return notFound("Track", *u.ID)
			}
			if owner != albumID {
				return apperr.BadRequest("Track %s does not belong to album %s", *u.ID, albumID)
			}
		}
		rows := make([]string, len(ids))
		args := make([]any, 0, len(ids)*3)
		for i, id := range ids {
			rows[i] = "(?::uuid, ?, ?::int)"
			args = append(args, id, latest[id].Title, latest[id].TrackNumber)
		}
		return tx.Exec(`UPDATE tracks AS t SET title = v.title, track_number = v.num
			FROM (VALUES `+strings.Join(rows, ", ")+`) AS v(id, title, num)
			WHERE t.id = v.id`, args...).Error
	})
	if err != nil {
		return nil, err
	}
	tracks, err := s.tracksByID(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make([]dto.Track, 0, len(updates))
	for _, u := range updates {
		if t, ok := tracks[*u.ID]; ok {
			out = append(out, dto.FromTrack(t))
		}
	}
	return out, nil
}

func (s *Catalog) tracksByID(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]*model.Track, error) {
	var tracks []model.Track
	if err := tracksQuery(s.db.WithContext(ctx)).Where("tracks.id IN ?", ids).Find(&tracks).Error; err != nil {
		return nil, err
	}
	byID := make(map[uuid.UUID]*model.Track, len(tracks))
	for i := range tracks {
		byID[tracks[i].ID] = &tracks[i]
	}
	return byID, nil
}

func requireTracks(tx *gorm.DB, ids []uuid.UUID) error {
	var found []uuid.UUID
	if err := tx.Model(&model.Track{}).Where("id IN ?", ids).Pluck("id", &found).Error; err != nil {
		return err
	}
	if len(found) == len(ids) {
		return nil
	}
	exists := make(map[uuid.UUID]bool, len(found))
	for _, id := range found {
		exists[id] = true
	}
	for _, id := range ids {
		if !exists[id] {
			return notFound("Track", id)
		}
	}
	return nil
}

func (s *Catalog) UpdateLrclibID(ctx context.Context, id uuid.UUID, lrclibID *int) (dto.Track, error) {
	res := s.db.WithContext(ctx).Model(&model.Track{}).Where("id = ?", id).Update("lrclib_id", lrclibID)
	if res.Error != nil {
		return dto.Track{}, res.Error
	}
	if res.RowsAffected == 0 {
		return dto.Track{}, notFound("Track", id)
	}
	return s.GetTrack(ctx, id)
}

func (s *Catalog) DeleteTrack(ctx context.Context, id uuid.UUID) error {
	var key string
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		t, err := first[model.Track](tx, "Track", id)
		if err != nil {
			return err
		}
		if t.R2Key != model.PendingKey {
			key = t.R2Key
		}
		return tx.Delete(&model.Track{}, "id = ?", id).Error
	})
	if err != nil {
		return err
	}
	deleteObjects(ctx, s.store, []string{key})
	return nil
}

// Images

func (s *Catalog) ImageKey(ctx context.Context, kind string, id uuid.UUID) (*string, error) {
	switch kind {
	case "artists":
		a, err := first[model.Artist](s.db.WithContext(ctx).Select("id", "avatar_key"), "Artist", id)
		if err != nil {
			return nil, err
		}
		return a.AvatarKey, nil
	case "albums":
		a, err := first[model.Album](s.db.WithContext(ctx).Select("id", "cover_key"), "Album", id)
		if err != nil {
			return nil, err
		}
		return a.CoverKey, nil
	}
	return nil, apperr.NotFound("Unknown image kind")
}

func imageKey(kind string, id uuid.UUID, ext string) string {
	return fmt.Sprintf("images/%s/%s-%s.%s", kind, id, newID(), ext)
}

func prepareImage(u *Upload) (*prepared, error) {
	if u == nil || u.Size == 0 {
		return nil, nil
	}
	return prepare(u, storage.ImageExt)
}

func lockForUpdate() clause.Locking {
	return clause.Locking{Strength: "UPDATE"}
}
