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

type Library struct {
	db *gorm.DB
}

func NewLibrary(gdb *gorm.DB) *Library { return &Library{db: gdb} }

// Album requests

type AlbumRequestInput struct {
	AlbumName   string `json:"albumName" binding:"notblank,size=0_160"`
	ArtistName  string `json:"artistName" binding:"notblank,size=0_160"`
	ExternalURL string `json:"externalUrl" binding:"notblank,size=0_600,httpurl"`
}

func (s *Library) SubmitRequest(ctx context.Context, user *model.User, in AlbumRequestInput) (dto.AlbumRequest, error) {
	requester, err := first[model.User](s.db.WithContext(ctx), "User", user.ID)
	if err != nil {
		return dto.AlbumRequest{}, err
	}
	if requester.RequestsBlocked {
		return dto.AlbumRequest{}, apperr.Forbidden("Album requests are disabled for this user")
	}
	r := model.AlbumRequest{
		AlbumName:   strings.TrimSpace(in.AlbumName),
		ArtistName:  strings.TrimSpace(in.ArtistName),
		ExternalURL: strings.TrimSpace(in.ExternalURL),
		Status:      model.RequestPending,
		RequesterID: requester.ID,
	}
	if err := s.db.WithContext(ctx).Omit("Requester").Create(&r).Error; err != nil {
		return dto.AlbumRequest{}, err
	}
	r.Requester = requester
	return dto.FromAlbumRequest(&r), nil
}

func (s *Library) requests(ctx context.Context, requester *uuid.UUID) ([]dto.AlbumRequest, error) {
	q := s.db.WithContext(ctx).Preload("Requester").Order("created_at DESC").Order("id DESC")
	if requester != nil {
		q = q.Where("requester_id = ?", *requester)
	}
	var rows []model.AlbumRequest
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}
	return dto.Map(rows, dto.FromAlbumRequest), nil
}

func (s *Library) MyRequests(ctx context.Context, user *model.User) ([]dto.AlbumRequest, error) {
	return s.requests(ctx, &user.ID)
}

func (s *Library) AllRequests(ctx context.Context) ([]dto.AlbumRequest, error) {
	return s.requests(ctx, nil)
}

func (s *Library) SetRequestStatus(ctx context.Context, id uuid.UUID, status model.AlbumRequestStatus) (dto.AlbumRequest, error) {
	if status != model.RequestAccepted && status != model.RequestRejected {
		return dto.AlbumRequest{}, apperr.BadRequest("Status can only be ACCEPTED or REJECTED")
	}
	var r *model.AlbumRequest
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		found, err := first[model.AlbumRequest](tx.Preload("Requester"), "Album request", id)
		if err != nil {
			return err
		}
		r = found
		r.Status = status
		return tx.Model(r).Select("status", "updated_at").Updates(r).Error
	})
	if err != nil {
		return dto.AlbumRequest{}, err
	}
	return dto.FromAlbumRequest(r), nil
}

func (s *Library) DeleteMyRequest(ctx context.Context, user *model.User, id uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		r, err := first[model.AlbumRequest](tx, "Album request", id)
		if err != nil {
			return err
		}
		if r.RequesterID != user.ID {
			return apperr.AccessDenied
		}
		if r.Status != model.RequestPending {
			return apperr.Conflict("Only pending requests can be deleted")
		}
		return tx.Delete(&model.AlbumRequest{}, "id = ?", id).Error
	})
}

// Favorites

func (s *Library) Favorites(ctx context.Context, user *model.User) ([]dto.FavoriteTrack, error) {
	var favs []model.Favorite
	err := s.db.WithContext(ctx).Preload("Track.Album.Artist").Preload("Track.Artist").
		Where("user_id = ?", user.ID).Order("favorited_at DESC").Order("id DESC").Find(&favs).Error
	if err != nil {
		return nil, err
	}
	return dto.Map(favs, func(f *model.Favorite) dto.FavoriteTrack {
		return dto.FavoriteTrack{Track: dto.FromTrack(f.Track), FavoritedAt: f.FavoritedAt.UTC()}
	}), nil
}

func (s *Library) AddFavorite(ctx context.Context, user *model.User, trackID uuid.UUID) (dto.Track, error) {
	track, err := first[model.Track](tracksQuery(s.db.WithContext(ctx)), "Track", trackID)
	if err != nil {
		return dto.Track{}, err
	}
	err = s.db.WithContext(ctx).Exec(
		`INSERT INTO favorites (id, user_id, track_id, favorited_at) VALUES (?, ?, ?, now() AT TIME ZONE 'UTC')
		 ON CONFLICT (user_id, track_id) DO NOTHING`, newID(), user.ID, trackID).Error
	if err != nil {
		return dto.Track{}, err
	}
	return dto.FromTrack(track), nil
}

func (s *Library) RemoveFavorite(ctx context.Context, user *model.User, trackID uuid.UUID) error {
	return s.db.WithContext(ctx).Where("user_id = ? AND track_id = ?", user.ID, trackID).Delete(&model.Favorite{}).Error
}

func (s *Library) CheckFavorites(ctx context.Context, user *model.User, trackIDs []uuid.UUID) ([]uuid.UUID, error) {
	out := []uuid.UUID{}
	if len(trackIDs) == 0 {
		return out, nil
	}
	err := s.db.WithContext(ctx).Model(&model.Favorite{}).
		Where("user_id = ? AND track_id IN ?", user.ID, trackIDs).Pluck("track_id", &out).Error
	return out, err
}

func newID() uuid.UUID {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.New()
	}
	return id
}
