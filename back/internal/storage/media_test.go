package storage

import (
	"errors"
	"testing"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
)

func TestAudioExt(t *testing.T) {
	cases := []struct {
		name, ct string
		header   []byte
		ext      string
		msg      string
	}{
		{"mp3 id3", "audio/mpeg", []byte("ID3\x04\x00"), "mp3", ""},
		{"mp3 frame sync", "audio/mpeg", []byte{0xFF, 0xFB, 0x90}, "mp3", ""},
		{"mp3 mpeg2 sync", "audio/mpeg", []byte{0xFF, 0xF3, 0x90}, "mp3", ""},
		{"aac adts", "audio/aac", []byte{0xFF, 0xF1, 0x50, 0x80}, "aac", ""},
		{"aac adts mpeg2", "audio/aac", []byte{0xFF, 0xF9, 0x50, 0x80}, "aac", ""},
		{"adts claimed mp3", "audio/mpeg", []byte{0xFF, 0xF1, 0x50}, "", "File content does not match claimed content type. Claimed: audio/mpeg"},
		{"ogg", "audio/ogg", []byte("OggS\x00\x02"), "ogg", ""},
		{"flac", "audio/flac", []byte("fLaC\x00"), "flac", ""},
		{"x-flac", "audio/x-flac", []byte("fLaC\x00"), "flac", ""},
		{"wav", "audio/wav", []byte("RIFF\x24\x00\x00\x00WAVE"), "wav", ""},
		{"flac claimed ogg", "audio/ogg", []byte("fLaC"), "", "File content does not match claimed content type. Claimed: audio/ogg"},
		{"empty file", "audio/flac", nil, "", "File content does not match claimed content type. Claimed: audio/flac"},
		{"unsupported", "audio/x-ms-wma", []byte("0&\xb2u"), "", "Unsupported audio format: audio/x-ms-wma"},
		{"missing type", "", []byte("fLaC"), "", "Unsupported audio format: null"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ext, err := AudioExt(tc.ct, tc.header)
			check(t, ext, err, tc.ext, tc.msg)
		})
	}
}

func TestImageExt(t *testing.T) {
	cases := []struct {
		name, ct string
		header   []byte
		ext      string
		msg      string
	}{
		{"jpeg", "image/jpeg", []byte{0xFF, 0xD8, 0xFF, 0xE0}, "jpg", ""},
		{"png", "image/png", []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A}, "png", ""},
		{"gif", "image/gif", []byte("GIF89a"), "gif", ""},
		{"webp", "image/webp", []byte("RIFF\x10\x00\x00\x00WEBP"), "webp", ""},
		{"wav claimed webp", "image/webp", []byte("RIFF\x10\x00\x00\x00WAVE"), "", "File content does not match claimed content type. Claimed: image/webp"},
		{"png claimed jpeg", "image/jpeg", []byte{0x89, 'P', 'N', 'G'}, "", "File content does not match claimed content type. Claimed: image/jpeg"},
		{"svg rejected", "image/svg+xml", []byte("<svg"), "", "Unsupported image type: image/svg+xml"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ext, err := ImageExt(tc.ct, tc.header)
			check(t, ext, err, tc.ext, tc.msg)
		})
	}
}

func check(t *testing.T, ext string, err error, wantExt, wantMsg string) {
	t.Helper()
	if wantMsg == "" {
		if err != nil || ext != wantExt {
			t.Fatalf("got %q %v want %q", ext, err, wantExt)
		}
		return
	}
	var ae *apperr.Error
	if !errors.As(err, &ae) || ae.Status != 400 || ae.Message != wantMsg {
		t.Fatalf("got %v want 400 %q", err, wantMsg)
	}
}

func TestIsHifi(t *testing.T) {
	for ct, want := range map[string]bool{"audio/flac": true, "audio/x-flac": true, "audio/wav": true, "audio/mpeg": false, "audio/ogg": false, "": false} {
		if IsHifi(ct) != want {
			t.Errorf("IsHifi(%q) != %v", ct, want)
		}
	}
}

func TestSplitEndpoint(t *testing.T) {
	cases := []struct {
		in     string
		host   string
		secure bool
	}{
		{"https://acct.r2.cloudflarestorage.com", "acct.r2.cloudflarestorage.com", true},
		{"http://localhost:9000", "localhost:9000", false},
		{"minio:9000", "minio:9000", true},
	}
	for _, tc := range cases {
		host, secure, err := splitEndpoint(tc.in)
		if err != nil || host != tc.host || secure != tc.secure {
			t.Errorf("%s: %s %v %v", tc.in, host, secure, err)
		}
	}
}
