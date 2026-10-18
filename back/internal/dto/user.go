package dto

import (
	"time"

	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

type User struct {
	ID       uuid.UUID  `json:"id"`
	Username string     `json:"username"`
	Role     model.Role `json:"role"`
}

func FromUser(u *model.User) User {
	return User{ID: u.ID, Username: u.Username, Role: u.Role}
}

type Listener struct {
	ID              uuid.UUID `json:"id"`
	Username        string    `json:"username"`
	RequestsBlocked bool      `json:"requestsBlocked"`
}

func FromListener(u *model.User) Listener {
	return Listener{ID: u.ID, Username: u.Username, RequestsBlocked: u.RequestsBlocked}
}

type AlbumRequest struct {
	ID                       uuid.UUID                `json:"id"`
	AlbumName                string                   `json:"albumName"`
	ArtistName               string                   `json:"artistName"`
	ExternalURL              string                   `json:"externalUrl"`
	Status                   model.AlbumRequestStatus `json:"status"`
	RequesterID              uuid.UUID                `json:"requesterId"`
	RequesterUsername        string                   `json:"requesterUsername"`
	RequesterRequestsBlocked bool                     `json:"requesterRequestsBlocked"`
	AdminNote                *string                  `json:"adminNote"`
	CreatedAt                time.Time                `json:"createdAt"`
	UpdatedAt                time.Time                `json:"updatedAt"`
}

func FromAlbumRequest(r *model.AlbumRequest) AlbumRequest {
	out := AlbumRequest{
		ID: r.ID, AlbumName: r.AlbumName, ArtistName: r.ArtistName, ExternalURL: r.ExternalURL,
		Status: r.Status, RequesterID: r.RequesterID, AdminNote: r.AdminNote,
		CreatedAt: r.CreatedAt.UTC(), UpdatedAt: r.UpdatedAt.UTC(),
	}
	if r.Requester != nil {
		out.RequesterUsername = r.Requester.Username
		out.RequesterRequestsBlocked = r.Requester.RequestsBlocked
	}
	return out
}

type FavoriteTrack struct {
	Track       Track     `json:"track"`
	FavoritedAt time.Time `json:"favoritedAt"`
}

type Playlist struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	OwnerID   uuid.UUID `json:"ownerId"`
	Tracks    []Track   `json:"tracks"`
	IsPublic  bool      `json:"isPublic"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type PlaylistSummary struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	TrackCount int       `json:"trackCount"`
	IsPublic   bool      `json:"isPublic"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
