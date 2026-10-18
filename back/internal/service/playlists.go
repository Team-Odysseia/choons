package service

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
	"github.com/Team-Odysseia/choons/back/internal/dto"
	"github.com/Team-Odysseia/choons/back/internal/model"
)

type Playlists struct {
	db *gorm.DB
}

func NewPlaylists(gdb *gorm.DB) *Playlists { return &Playlists{db: gdb} }

func (s *Playlists) Create(ctx context.Context, user *model.User, name string) (dto.Playlist, error) {
	p := model.Playlist{Name: name, OwnerID: user.ID}
	if err := s.db.WithContext(ctx).Create(&p).Error; err != nil {
		return dto.Playlist{}, err
	}
	return s.response(s.db.WithContext(ctx), &p)
}

func (s *Playlists) summaries(ctx context.Context, where string, args ...any) ([]dto.PlaylistSummary, error) {
	var rows []struct {
		model.Playlist
		TrackCount int
	}
	err := s.db.WithContext(ctx).Model(&model.Playlist{}).
		Select("playlists.*, (SELECT count(*) FROM playlist_tracks pt WHERE pt.playlist_id = playlists.id) AS track_count").
		Where(where, args...).Order("updated_at DESC").Order("id DESC").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]dto.PlaylistSummary, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.PlaylistSummary{ID: r.ID, Name: r.Name, TrackCount: r.TrackCount, IsPublic: r.IsPublic, UpdatedAt: r.UpdatedAt.UTC()})
	}
	return out, nil
}

func (s *Playlists) Mine(ctx context.Context, user *model.User) ([]dto.PlaylistSummary, error) {
	return s.summaries(ctx, "owner_id = ?", user.ID)
}

func (s *Playlists) Public(ctx context.Context, user *model.User) ([]dto.PlaylistSummary, error) {
	return s.summaries(ctx, "is_public = true AND owner_id <> ?", user.ID)
}

func (s *Playlists) Get(ctx context.Context, user *model.User, id uuid.UUID) (dto.Playlist, error) {
	tx := s.db.WithContext(ctx)
	p, err := first[model.Playlist](tx, "Playlist", id)
	if err != nil {
		return dto.Playlist{}, err
	}
	if p.OwnerID != user.ID && !p.IsPublic {
		return dto.Playlist{}, apperr.AccessDenied
	}
	return s.response(tx, p)
}

func (s *Playlists) owned(tx *gorm.DB, user *model.User, id uuid.UUID) (*model.Playlist, error) {
	p, err := first[model.Playlist](tx, "Playlist", id)
	if err != nil {
		return nil, err
	}
	if p.OwnerID != user.ID {
		return nil, apperr.AccessDenied
	}
	return p, nil
}

func (s *Playlists) mutate(ctx context.Context, user *model.User, id uuid.UUID, fn func(tx *gorm.DB, p *model.Playlist) error) (dto.Playlist, error) {
	var out dto.Playlist
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		p, err := s.owned(tx.Clauses(lockForUpdate()), user, id)
		if err != nil {
			return err
		}
		if err := fn(tx, p); err != nil {
			return err
		}
		p.UpdatedAt = tx.NowFunc()
		if err := tx.Model(p).UpdateColumn("updated_at", p.UpdatedAt).Error; err != nil {
			return err
		}
		out, err = s.response(tx, p)
		return err
	})
	return out, err
}

func (s *Playlists) AddTrack(ctx context.Context, user *model.User, id, trackID uuid.UUID) (dto.Playlist, error) {
	return s.mutate(ctx, user, id, func(tx *gorm.DB, p *model.Playlist) error {
		if _, err := first[model.Track](tx.Select("id"), "Track", trackID); err != nil {
			return err
		}
		var n int64
		if err := tx.Model(&model.PlaylistTrack{}).Where("playlist_id = ?", id).Count(&n).Error; err != nil {
			return err
		}
		return tx.Omit("Track").Create(&model.PlaylistTrack{PlaylistID: id, TrackID: trackID, Position: int(n)}).Error
	})
}

func (s *Playlists) RemoveTrack(ctx context.Context, user *model.User, id, trackID uuid.UUID) (dto.Playlist, error) {
	return s.mutate(ctx, user, id, func(tx *gorm.DB, p *model.Playlist) error {
		if err := tx.Where("playlist_id = ? AND track_id = ?", id, trackID).Delete(&model.PlaylistTrack{}).Error; err != nil {
			return err
		}
		return compactPositions(tx, "playlist_tracks", "playlist_id", id, "position, id")
	})
}

func (s *Playlists) Reorder(ctx context.Context, user *model.User, id uuid.UUID, trackIDs []uuid.UUID) (dto.Playlist, error) {
	return s.mutate(ctx, user, id, func(tx *gorm.DB, p *model.Playlist) error {
		var entries []model.PlaylistTrack
		if err := tx.Where("playlist_id = ?", id).Order("position ASC").Find(&entries).Error; err != nil {
			return err
		}
		if len(entries) != len(trackIDs) {
			return apperr.BadRequest("Reorder list size mismatch")
		}
		requested := make(map[uuid.UUID]struct{}, len(trackIDs))
		for _, t := range trackIDs {
			requested[t] = struct{}{}
		}
		if len(requested) != len(trackIDs) {
			return apperr.BadRequest("Reorder list contains duplicate track IDs")
		}
		entryByTrack := make(map[uuid.UUID]uuid.UUID, len(entries))
		for _, e := range entries {
			entryByTrack[e.TrackID] = e.ID
		}
		if len(entryByTrack) != len(requested) {
			return apperr.BadRequest("Reorder list must contain all playlist tracks exactly once")
		}
		order := make([]uuid.UUID, len(trackIDs))
		for i, t := range trackIDs {
			entryID, ok := entryByTrack[t]
			if !ok {
				return apperr.BadRequest("Reorder list must contain all playlist tracks exactly once")
			}
			order[i] = entryID
		}
		return setPositions(tx, "playlist_tracks", order)
	})
}

func (s *Playlists) SetVisibility(ctx context.Context, user *model.User, id uuid.UUID, public bool) (dto.Playlist, error) {
	return s.mutate(ctx, user, id, func(tx *gorm.DB, p *model.Playlist) error {
		p.IsPublic = public
		return tx.Model(p).UpdateColumn("is_public", public).Error
	})
}

func (s *Playlists) Delete(ctx context.Context, user *model.User, id uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if _, err := s.owned(tx, user, id); err != nil {
			return err
		}
		return tx.Delete(&model.Playlist{}, "id = ?", id).Error
	})
}

func (s *Playlists) response(tx *gorm.DB, p *model.Playlist) (dto.Playlist, error) {
	var entries []model.PlaylistTrack
	err := tx.Preload("Track.Album.Artist").Preload("Track.Artist").
		Where("playlist_id = ?", p.ID).Order("position ASC").Find(&entries).Error
	if err != nil {
		return dto.Playlist{}, err
	}
	tracks := dto.Map(entries, func(e *model.PlaylistTrack) dto.Track { return dto.FromTrack(e.Track) })
	return dto.Playlist{
		ID: p.ID, Name: p.Name, OwnerID: p.OwnerID, Tracks: tracks,
		IsPublic: p.IsPublic, CreatedAt: p.CreatedAt.UTC(), UpdatedAt: p.UpdatedAt.UTC(),
	}, nil
}

func setPositions(tx *gorm.DB, table string, orderedIDs []uuid.UUID) error {
	if len(orderedIDs) == 0 {
		return nil
	}
	ids := make([]string, len(orderedIDs))
	for i, id := range orderedIDs {
		ids[i] = id.String()
	}
	return tx.Exec(`UPDATE `+table+` AS t SET position = v.ord - 1
		FROM unnest(?::uuid[]) WITH ORDINALITY AS v(id, ord)
		WHERE t.id = v.id AND t.position <> v.ord - 1`, "{"+strings.Join(ids, ",")+"}").Error
}

func compactPositions(tx *gorm.DB, table, scope string, scopeID uuid.UUID, order string) error {
	return tx.Exec(`UPDATE `+table+` AS t SET position = r.pos
		FROM (SELECT id, row_number() OVER (ORDER BY `+order+`) - 1 AS pos FROM `+table+` WHERE `+scope+` = ?) AS r
		WHERE t.id = r.id AND t.position <> r.pos`, scopeID).Error
}
