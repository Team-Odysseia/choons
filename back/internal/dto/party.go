package dto

import (
	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

type PartyMember struct {
	UserID    uuid.UUID `json:"userId"`
	Username  string    `json:"username"`
	Host      bool      `json:"host"`
	DJ        bool      `json:"dj"`
	Connected bool      `json:"connected"`
}

type PartyQueueItem struct {
	ID              uuid.UUID `json:"id"`
	Position        int       `json:"position"`
	Track           Track     `json:"track"`
	AddedByUserID   uuid.UUID `json:"addedByUserId"`
	AddedByUsername string    `json:"addedByUsername"`
}

type PartyPlayback struct {
	Track             *Track  `json:"track"`
	Playing           bool    `json:"playing"`
	AnchorPositionSec float64 `json:"anchorPositionSec"`
	AnchorEpochMs     int64   `json:"anchorEpochMs"`
}

type PartyState struct {
	ID          uuid.UUID         `json:"id"`
	InviteCode  string            `json:"inviteCode"`
	Name        string            `json:"name"`
	QueuePolicy model.QueuePolicy `json:"queuePolicy"`
	HostUserID  uuid.UUID         `json:"hostUserId"`
	Members     []PartyMember     `json:"members"`
	Queue       []PartyQueueItem  `json:"queue"`
	Playback    PartyPlayback     `json:"playback"`
}
