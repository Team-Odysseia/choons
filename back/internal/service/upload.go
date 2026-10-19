package service

import (
	"bufio"
	"context"
	"errors"
	"io"
	"log/slog"

	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/storage"
)

type Upload struct {
	ContentType string
	Size        int64
	Open        func() (io.ReadCloser, error)
}

type prepared struct {
	ext         string
	contentType string
	size        int64
	body        io.Reader
	closer      io.Closer
}

func prepare(u *Upload, detect func(contentType string, header []byte) (string, error)) (*prepared, error) {
	rc, err := u.Open()
	if err != nil {
		return nil, err
	}
	br := bufio.NewReaderSize(rc, 4096)
	header, err := br.Peek(storage.HeaderSize)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, bufio.ErrBufferFull) {
		_ = rc.Close()
		return nil, err
	}
	ext, err := detect(u.ContentType, header)
	if err != nil {
		_ = rc.Close()
		return nil, err
	}
	return &prepared{ext: ext, contentType: u.ContentType, size: u.Size, body: br, closer: rc}, nil
}

func (p *prepared) close() {
	if p != nil && p.closer != nil {
		_ = p.closer.Close()
	}
}

type uploads struct {
	store storage.Storage
	keys  []string
}

func (u *uploads) put(ctx context.Context, key string, p *prepared) error {
	defer p.close()
	if err := u.store.Put(ctx, key, p.body, p.size, p.contentType); err != nil {
		return err
	}
	u.keys = append(u.keys, key)
	return nil
}

func deleteObjects(ctx context.Context, store storage.Storage, keys []string) {
	for _, k := range keys {
		if k == "" {
			continue
		}
		if err := store.Delete(ctx, k); err != nil {
			slog.Warn("delete object failed", "key", k, "err", err)
		}
	}
}

func withUploads(ctx context.Context, gdb *gorm.DB, store storage.Storage, upload func(up *uploads) error, write func(tx *gorm.DB) error) error {
	up := &uploads{store: store}
	err := upload(up)
	if err == nil {
		err = gdb.WithContext(ctx).Transaction(write)
	}
	if err != nil {
		deleteObjects(context.WithoutCancel(ctx), store, up.keys)
	}
	return err
}
