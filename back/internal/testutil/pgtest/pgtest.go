package pgtest

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/db"
)

var (
	once     sync.Once
	baseURL  string
	startErr error
)

func server(t *testing.T) string {
	t.Helper()
	once.Do(func() {
		if v := os.Getenv("TEST_DATABASE_URL"); v != "" {
			baseURL = v
			return
		}
		ctx := context.Background()
		c, err := tcpostgres.Run(ctx, "postgres:16-alpine",
			tcpostgres.WithDatabase("postgres"),
			tcpostgres.WithUsername("postgres"),
			tcpostgres.WithPassword("postgres"),
			tcpostgres.BasicWaitStrategies(),
			testcontainers.WithTmpfs(map[string]string{"/var/lib/postgresql/data": "rw"}),
		)
		if err != nil {
			startErr = err
			return
		}
		baseURL, startErr = c.ConnectionString(ctx, "sslmode=disable")
	})
	if startErr != nil {
		t.Fatalf("start postgres: %v", startErr)
	}
	return baseURL
}

func NewDSN(t *testing.T) string {
	t.Helper()
	base := server(t)
	admin, err := sql.Open("pgx", base)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	name := "t_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	create := "CREATE DATABASE " + name
	if tpl := os.Getenv("TEST_DATABASE_TEMPLATE"); tpl != "" {
		create += " TEMPLATE " + tpl
	}
	if _, err := admin.ExecContext(ctx, create); err != nil {
		t.Fatalf("create database: %v", err)
	}
	t.Cleanup(func() {
		cleanup, err := sql.Open("pgx", base)
		if err != nil {
			return
		}
		defer cleanup.Close()
		_, _ = cleanup.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s WITH (FORCE)", name))
	})
	u, err := url.Parse(base)
	if err != nil {
		t.Fatal(err)
	}
	u.Path = "/" + name
	return u.String()
}

func Open(t *testing.T, dsn string) *gorm.DB {
	t.Helper()
	gdb, err := db.Open(dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if sqlDB, err := gdb.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	return gdb
}

func NewDB(t *testing.T) *gorm.DB {
	t.Helper()
	gdb := Open(t, NewDSN(t))
	if err := db.Migrate(context.Background(), gdb); err != nil {
		t.Fatal(err)
	}
	return gdb
}
