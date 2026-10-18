package storage

import (
	"context"
	"errors"
	"io"
	"slices"
	"sync"
	"time"
)

type FakeObject struct {
	Body        []byte
	ContentType string
}

type Fake struct {
	mu      sync.Mutex
	Objects map[string]FakeObject
	Deleted []string
	FailPut error
}

func NewFake() *Fake {
	return &Fake{Objects: map[string]FakeObject{}}
}

func (f *Fake) Put(_ context.Context, key string, body io.Reader, size int64, contentType string) error {
	f.mu.Lock()
	fail := f.FailPut
	f.mu.Unlock()
	if fail != nil {
		return fail
	}
	data, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	if size >= 0 && int64(len(data)) != size {
		return errors.New("size mismatch")
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Objects[key] = FakeObject{Body: data, ContentType: contentType}
	return nil
}

func (f *Fake) Delete(_ context.Context, key string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.Objects, key)
	f.Deleted = append(f.Deleted, key)
	return nil
}

func (f *Fake) PresignGet(_ context.Context, key string, ttl time.Duration) (string, error) {
	return "https://r2.test/" + key + "?ttl=" + ttl.String(), nil
}

func (f *Fake) Ping(context.Context) error { return nil }

func (f *Fake) Has(key string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	_, ok := f.Objects[key]
	return ok
}

func (f *Fake) Keys() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	keys := make([]string, 0, len(f.Objects))
	for k := range f.Objects {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	return keys
}

func (f *Fake) WasDeleted(key string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return slices.Contains(f.Deleted, key)
}
