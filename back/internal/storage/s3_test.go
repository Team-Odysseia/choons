package storage

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

const seaweedConfig = `{"identities":[{"name":"test","credentials":[{"accessKey":"testkey","secretKey":"testsecret"}],"actions":["Admin","Read","Write","List","Tagging"]}]}`

func startS3(t *testing.T) string {
	t.Helper()
	if v := os.Getenv("TEST_S3_ENDPOINT"); v != "" {
		return v
	}
	ctx := context.Background()
	c, err := testcontainers.Run(ctx, "chrislusf/seaweedfs:3.97",
		testcontainers.WithCmd("server", "-dir=/data", "-s3", "-s3.config=/etc/s3.json", "-volume.max=5"),
		testcontainers.WithFiles(testcontainers.ContainerFile{
			Reader:            strings.NewReader(seaweedConfig),
			ContainerFilePath: "/etc/s3.json",
			FileMode:          0o644,
		}),
		testcontainers.WithExposedPorts("8333/tcp"),
		testcontainers.WithWaitStrategy(wait.ForListeningPort("8333/tcp").WithStartupTimeout(90*time.Second)),
	)
	if err != nil {
		t.Fatalf("start seaweedfs: %v", err)
	}
	t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	endpoint, err := c.PortEndpoint(ctx, "8333/tcp", "http")
	if err != nil {
		t.Fatal(err)
	}
	return endpoint
}

func makeBucket(t *testing.T, s *S3) {
	t.Helper()
	ctx := context.Background()
	deadline := time.Now().Add(60 * time.Second)
	for {
		err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{})
		if err == nil {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("make bucket: %v", err)
		}
		time.Sleep(time.Second)
	}
}

func get(t *testing.T, url, rangeHeader string) (int, http.Header, []byte) {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		t.Fatal(err)
	}
	if rangeHeader != "" {
		req.Header.Set("Range", rangeHeader)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, resp.Header, body
}

func TestS3PresignedRangeStreaming(t *testing.T) {
	if os.Getenv("SKIP_S3_TESTS") != "" {
		t.Skip("SKIP_S3_TESTS set")
	}
	endpoint := startS3(t)
	s, err := NewS3(endpoint, "testkey", "testsecret", "choons")
	if err != nil {
		t.Fatal(err)
	}
	makeBucket(t, s)
	ctx := context.Background()
	if err := s.Ping(ctx); err != nil {
		t.Fatal(err)
	}

	body := bytes.Repeat([]byte("0123456789"), 1000)
	key := "audio/a/b/c.flac"
	if err := s.Put(ctx, key, bytes.NewReader(body), int64(len(body)), "audio/flac"); err != nil {
		t.Fatal(err)
	}
	signed, err := s.PresignGet(ctx, key, time.Minute)
	if err != nil {
		t.Fatal(err)
	}

	status, h, got := get(t, signed, "")
	if status != 200 || !bytes.Equal(got, body) || h.Get("Content-Type") != "audio/flac" {
		t.Fatalf("full get: %d len=%d ct=%s", status, len(got), h.Get("Content-Type"))
	}

	status, h, got = get(t, signed, "bytes=100-199")
	if status != http.StatusPartialContent || !bytes.Equal(got, body[100:200]) || h.Get("Content-Range") != "bytes 100-199/10000" {
		t.Fatalf("range get: %d %q len=%d", status, h.Get("Content-Range"), len(got))
	}

	status, _, got = get(t, signed, "bytes=-10")
	if status != http.StatusPartialContent || !bytes.Equal(got, body[len(body)-10:]) {
		t.Fatalf("suffix range: %d %q", status, got)
	}

	tampered := strings.Replace(signed, "c.flac", "d.flac", 1)
	if status, _, _ := get(t, tampered, ""); status != http.StatusForbidden {
		t.Fatalf("tampered presign: %d", status)
	}

	if err := s.Delete(ctx, key); err != nil {
		t.Fatal(err)
	}
	if status, _, _ := get(t, signed, ""); status != http.StatusNotFound {
		t.Fatalf("after delete: %d", status)
	}

	bad, err := NewS3(endpoint, "testkey", "wrong", "choons")
	if err != nil {
		t.Fatal(err)
	}
	if err := bad.Put(ctx, "x", bytes.NewReader([]byte("x")), 1, "text/plain"); err == nil {
		t.Fatal("put with wrong secret succeeded")
	}
}
