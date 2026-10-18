package dto

import (
	"time"

	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/storage"
)

type Artist struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Bio       *string   `json:"bio"`
	CreatedAt time.Time `json:"createdAt"`
	AvatarURL *string   `json:"avatarUrl"`
}

type Album struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	Artist      Artist    `json:"artist"`
	ReleaseYear int       `json:"releaseYear"`
	CreatedAt   time.Time `json:"createdAt"`
	CoverURL    *string   `json:"coverUrl"`
}

type Track struct {
	ID              uuid.UUID `json:"id"`
	Title           string    `json:"title"`
	Album           Album     `json:"album"`
	Artist          Artist    `json:"artist"`
	TrackNumber     int       `json:"trackNumber"`
	DurationSeconds int       `json:"durationSeconds"`
	CreatedAt       time.Time `json:"createdAt"`
	Hifi            bool      `json:"hifi"`
	LrclibID        *int      `json:"lrclibId"`
}

func imageURL(kind string, id uuid.UUID, key *string) *string {
	if key == nil {
		return nil
	}
	u := "/media/images/" + kind + "/" + id.String()
	return &u
}

func FromArtist(a *model.Artist) Artist {
	if a == nil {
		return Artist{}
	}
	return Artist{
		ID:        a.ID,
		Name:      a.Name,
		Bio:       a.Bio,
		CreatedAt: a.CreatedAt.UTC(),
		AvatarURL: imageURL("artists", a.ID, a.AvatarKey),
	}
}

func FromAlbum(a *model.Album) Album {
	if a == nil {
		return Album{}
	}
	return Album{
		ID:          a.ID,
		Title:       a.Title,
		Artist:      FromArtist(a.Artist),
		ReleaseYear: a.ReleaseYear,
		CreatedAt:   a.CreatedAt.UTC(),
		CoverURL:    imageURL("albums", a.ID, a.CoverKey),
	}
}

func FromTrack(t *model.Track) Track {
	return Track{
		ID:              t.ID,
		Title:           t.Title,
		Album:           FromAlbum(t.Album),
		Artist:          FromArtist(t.Artist),
		TrackNumber:     t.TrackNumber,
		DurationSeconds: t.DurationSeconds,
		CreatedAt:       t.CreatedAt.UTC(),
		Hifi:            storage.IsHifi(t.ContentType),
		LrclibID:        t.LrclibID,
	}
}

func Map[M any, D any](items []M, fn func(*M) D) []D {
	out := make([]D, 0, len(items))
	for i := range items {
		out = append(out, fn(&items[i]))
	}
	return out
}
