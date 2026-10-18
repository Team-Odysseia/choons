package storage

import (
	"bytes"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
)

const HeaderSize = 12

var audioExt = map[string]string{
	"audio/mpeg":   "mp3",
	"audio/ogg":    "ogg",
	"audio/flac":   "flac",
	"audio/x-flac": "flac",
	"audio/wav":    "wav",
	"audio/aac":    "aac",
}

var imageExt = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/webp": "webp",
	"image/gif":  "gif",
}

func AudioExt(contentType string, header []byte) (string, error) {
	ext, ok := audioExt[contentType]
	if !ok {
		return "", apperr.BadRequest("Unsupported audio format: %s", nullable(contentType))
	}
	if !audioMatches(ext, header) {
		return "", apperr.BadRequest("File content does not match claimed content type. Claimed: %s", contentType)
	}
	return ext, nil
}

func ImageExt(contentType string, header []byte) (string, error) {
	ext, ok := imageExt[contentType]
	if !ok {
		return "", apperr.BadRequest("Unsupported image type: %s", nullable(contentType))
	}
	if !imageMatches(ext, header) {
		return "", apperr.BadRequest("File content does not match claimed content type. Claimed: %s", contentType)
	}
	return ext, nil
}

func IsHifi(contentType string) bool {
	switch contentType {
	case "audio/flac", "audio/x-flac", "audio/wav":
		return true
	}
	return false
}

func nullable(s string) string {
	if s == "" {
		return "null"
	}
	return s
}

func audioMatches(ext string, h []byte) bool {
	switch ext {
	case "mp3":
		return bytes.HasPrefix(h, []byte("ID3")) ||
			(len(h) >= 2 && h[0] == 0xFF && (h[1]&0xE0) == 0xE0 && (h[1]&0x06) != 0)
	case "aac":
		return len(h) >= 2 && h[0] == 0xFF && (h[1]&0xF6) == 0xF0
	case "ogg":
		return bytes.HasPrefix(h, []byte("OggS"))
	case "flac":
		return bytes.HasPrefix(h, []byte("fLaC"))
	case "wav":
		return bytes.HasPrefix(h, []byte("RIFF"))
	}
	return false
}

func imageMatches(ext string, h []byte) bool {
	switch ext {
	case "jpg":
		return bytes.HasPrefix(h, []byte{0xFF, 0xD8, 0xFF})
	case "png":
		return bytes.HasPrefix(h, []byte{0x89, 'P', 'N', 'G'})
	case "gif":
		return bytes.HasPrefix(h, []byte("GIF8"))
	case "webp":
		return len(h) >= 12 && bytes.HasPrefix(h, []byte("RIFF")) && bytes.Equal(h[8:12], []byte("WEBP"))
	}
	return false
}
