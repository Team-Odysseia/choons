package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Base struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey"`
}

func (b *Base) BeforeCreate(*gorm.DB) error {
	if b.ID != uuid.Nil {
		return nil
	}
	id, err := uuid.NewV7()
	if err != nil {
		return err
	}
	b.ID = id
	return nil
}

type Role string

const (
	RoleListener Role = "LISTENER"
	RoleAdmin    Role = "ADMIN"
)

type User struct {
	Base
	Username        string
	Password        string
	Role            Role
	RequestsBlocked bool
}

type Artist struct {
	Base
	Name      string
	Bio       *string
	AvatarKey *string
	CreatedAt time.Time
}

type Album struct {
	Base
	Title       string
	ArtistID    uuid.UUID `gorm:"type:uuid"`
	Artist      *Artist
	ReleaseYear int
	CoverKey    *string
	CreatedAt   time.Time
}

const PendingKey = "pending"

type Track struct {
	Base
	Title           string
	AlbumID         uuid.UUID `gorm:"type:uuid"`
	Album           *Album
	ArtistID        uuid.UUID `gorm:"type:uuid"`
	Artist          *Artist
	TrackNumber     int
	DurationSeconds int
	R2Key           string `gorm:"column:r2_key"`
	ContentType     string
	LrclibID        *int
	CreatedAt       time.Time
}

type Playlist struct {
	Base
	Name      string
	OwnerID   uuid.UUID `gorm:"type:uuid"`
	IsPublic  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

type PlaylistTrack struct {
	Base
	PlaylistID uuid.UUID `gorm:"type:uuid"`
	TrackID    uuid.UUID `gorm:"type:uuid"`
	Track      *Track
	Position   int
}

type Favorite struct {
	Base
	UserID      uuid.UUID `gorm:"type:uuid"`
	TrackID     uuid.UUID `gorm:"type:uuid"`
	Track       *Track
	FavoritedAt time.Time `gorm:"autoCreateTime"`
}

type StreamEvent struct {
	Base
	UserID   uuid.UUID `gorm:"type:uuid"`
	TrackID  uuid.UUID `gorm:"type:uuid"`
	PlayedAt time.Time `gorm:"autoCreateTime"`
}

type AlbumRequestStatus string

const (
	RequestPending  AlbumRequestStatus = "PENDING"
	RequestAccepted AlbumRequestStatus = "ACCEPTED"
	RequestRejected AlbumRequestStatus = "REJECTED"
)

type AlbumRequest struct {
	Base
	AlbumName   string
	ArtistName  string
	ExternalURL string `gorm:"column:external_url"`
	Status      AlbumRequestStatus
	RequesterID uuid.UUID `gorm:"type:uuid"`
	Requester   *User
	AdminNote   *string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type QueuePolicy string

const (
	PolicyDJOnly   QueuePolicy = "DJ_ONLY"
	PolicyEveryone QueuePolicy = "EVERYONE"
)

type PartyStatus string

const (
	PartyActive PartyStatus = "ACTIVE"
	PartyEnded  PartyStatus = "ENDED"
)

type Party struct {
	Base
	InviteCode  string
	Name        string
	HostUserID  uuid.UUID `gorm:"type:uuid"`
	QueuePolicy QueuePolicy
	Status      PartyStatus
	Revision    int64
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type PartyMember struct {
	Base
	PartyID   uuid.UUID `gorm:"type:uuid"`
	UserID    uuid.UUID `gorm:"type:uuid"`
	User      *User
	Host      bool
	DJ        bool `gorm:"column:dj"`
	Connected bool
	JoinedAt  time.Time `gorm:"autoCreateTime"`
}

type PartyPlaybackState struct {
	Base
	PartyID           uuid.UUID  `gorm:"type:uuid"`
	TrackID           *uuid.UUID `gorm:"type:uuid"`
	Track             *Track
	Playing           bool
	AnchorPositionSec float64
	AnchorEpochMs     int64
	UpdatedAt         time.Time
}

func (PartyPlaybackState) TableName() string { return "party_playback_state" }

type PartyQueueItem struct {
	Base
	PartyID       uuid.UUID `gorm:"type:uuid"`
	TrackID       uuid.UUID `gorm:"type:uuid"`
	Track         *Track
	AddedByUserID uuid.UUID `gorm:"type:uuid"`
	AddedBy       *User     `gorm:"foreignKey:AddedByUserID"`
	Position      int
	CreatedAt     time.Time
}
