package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const lrclibUserAgent = "Choons/1.0 (self-hosted music server)"

type Lrclib struct {
	BaseURL string
	Client  *http.Client
}

func NewLrclib() *Lrclib {
	return &Lrclib{BaseURL: "https://lrclib.net", Client: &http.Client{Timeout: 10 * time.Second}}
}

func (l *Lrclib) Find(ctx context.Context, title, artist, album string, durationSeconds int) (*int, error) {
	q := url.Values{}
	q.Set("track_name", title)
	q.Set("artist_name", artist)
	q.Set("album_name", album)
	q.Set("duration", strconv.Itoa(durationSeconds))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, l.BaseURL+"/api/get?"+q.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", lrclibUserAgent)
	resp, err := l.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("lrclib status %d", resp.StatusCode)
	}
	var body struct {
		ID *int `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	return body.ID, nil
}
