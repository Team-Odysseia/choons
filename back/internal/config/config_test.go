package config

import (
	"testing"
	"time"
)

func TestNormalizePostgresURI(t *testing.T) {
	cases := []struct {
		name, raw, user, pass, want string
		wantErr                     bool
	}{
		{"jdbc form", "jdbc:postgresql://db:5432/choons", "choons", "s3cr@t", "postgres://choons:s3cr%40t@db:5432/choons", false},
		{"keeps query", "jdbc:postgresql://db/choons?sslmode=require", "u", "p", "postgres://u:p@db/choons?sslmode=require", false},
		{"native form without creds", "postgres://u:p@db/choons", "", "", "postgres://u:p@db/choons", false},
		{"bad scheme", "jdbc:mysql://db/choons", "u", "p", "", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := NormalizePostgresURI(tc.raw, tc.user, tc.pass)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error, got %q", got)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got != tc.want {
				t.Fatalf("got %q want %q", got, tc.want)
			}
		})
	}
}

func TestLoadRequiresStrongSecret(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://u:p@db/choons")
	t.Setenv("R2_ENDPOINT", "https://r2.test")
	t.Setenv("R2_ACCESS_KEY", "k")
	t.Setenv("R2_SECRET_KEY", "s")
	t.Setenv("JWT_SECRET", "short")
	if _, err := Load(); err == nil {
		t.Fatal("expected error for short JWT_SECRET")
	}
	t.Setenv("JWT_SECRET", "0123456789abcdef0123456789abcdef")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.CookieName != "CHOONS_AUTH" || cfg.R2Bucket != "choons" || cfg.LoginPerMin != 10 || cfg.StreamPerMin != 60 {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
}

func TestLoadRequiresStorageCredentials(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://u:p@db/choons")
	t.Setenv("JWT_SECRET", "0123456789abcdef0123456789abcdef")
	t.Setenv("R2_ENDPOINT", "")
	if _, err := Load(); err == nil || err.Error() != "R2_ENDPOINT must be set" {
		t.Fatalf("got %v", err)
	}
}

func TestLoadParsesOverrides(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://u:p@db/choons")
	t.Setenv("JWT_SECRET", "0123456789abcdef0123456789abcdef")
	t.Setenv("R2_ENDPOINT", "https://r2.test")
	t.Setenv("R2_ACCESS_KEY", "k")
	t.Setenv("R2_SECRET_KEY", "s")
	t.Setenv("CORS_ALLOWED_ORIGINS", " https://a.app , https://b.app ,")
	t.Setenv("AUTH_COOKIE_SECURE", "true")
	t.Setenv("STREAM_URL_TTL", "90m")
	t.Setenv("RATE_LIMIT_STREAM_PER_MINUTE", "120")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.CORSOrigins) != 2 || cfg.CORSOrigins[1] != "https://b.app" || !cfg.CookieSecure || cfg.StreamURLTTL.Minutes() != 90 || cfg.StreamPerMin != 120 {
		t.Fatalf("%+v", cfg)
	}
	t.Setenv("STREAM_URL_TTL", "forever")
	if _, err := Load(); err == nil {
		t.Fatal("invalid duration accepted")
	}
}

func TestLoadTelemetry(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://u:p@db/choons")
	t.Setenv("JWT_SECRET", "0123456789abcdef0123456789abcdef")
	t.Setenv("R2_ENDPOINT", "https://r2.test")
	t.Setenv("R2_ACCESS_KEY", "k")
	t.Setenv("R2_SECRET_KEY", "s")
	t.Setenv("POSTHOG_KEY", "")
	t.Setenv("POSTHOG_HOST", "")
	t.Setenv("APP_ENV", "")
	t.Setenv("SLOW_REQUEST_THRESHOLD", "")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.PostHogKey != "" || cfg.PostHogHost != "https://us.i.posthog.com" || cfg.AppEnv != "development" || cfg.SlowRequestThreshold != time.Second {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}

	t.Setenv("POSTHOG_KEY", "phc_test")
	t.Setenv("APP_ENV", "production")
	t.Setenv("SLOW_REQUEST_THRESHOLD", "750ms")
	cfg, err = Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.PostHogKey != "phc_test" || cfg.AppEnv != "production" || cfg.SlowRequestThreshold != 750*time.Millisecond {
		t.Fatalf("unexpected config: %+v", cfg)
	}

	t.Setenv("SLOW_REQUEST_THRESHOLD", "soon")
	if _, err := Load(); err == nil {
		t.Fatal("expected error for invalid SLOW_REQUEST_THRESHOLD")
	}
}
