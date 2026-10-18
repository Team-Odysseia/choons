package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      []byte
	CookieName     string
	CookieSecure   bool
	CORSOrigins    []string
	R2Endpoint     string
	R2AccessKey    string
	R2SecretKey    string
	R2Bucket       string
	StreamURLTTL   time.Duration
	ImageURLTTL    time.Duration
	LoginPerMin    int
	StreamPerMin   int
	TrustedProxies []string
	AdminUsername  string
	AdminPassword  string
}

func Load() (Config, error) {
	dbURL, err := databaseURL()
	if err != nil {
		return Config{}, err
	}
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		return Config{}, errors.New("JWT_SECRET must be set and at least 32 bytes")
	}
	for _, key := range []string{"R2_ENDPOINT", "R2_ACCESS_KEY", "R2_SECRET_KEY"} {
		if os.Getenv(key) == "" {
			return Config{}, fmt.Errorf("%s must be set", key)
		}
	}
	streamTTL, err := duration("STREAM_URL_TTL", 6*time.Hour)
	if err != nil {
		return Config{}, err
	}
	imageTTL, err := duration("IMAGE_URL_TTL", time.Hour)
	if err != nil {
		return Config{}, err
	}
	return Config{
		Port:           env("PORT", "8080"),
		DatabaseURL:    dbURL,
		JWTSecret:      []byte(secret),
		CookieName:     env("AUTH_COOKIE_NAME", "CHOONS_AUTH"),
		CookieSecure:   env("AUTH_COOKIE_SECURE", "false") == "true",
		CORSOrigins:    list(env("CORS_ALLOWED_ORIGINS", "http://localhost:5173")),
		R2Endpoint:     os.Getenv("R2_ENDPOINT"),
		R2AccessKey:    os.Getenv("R2_ACCESS_KEY"),
		R2SecretKey:    os.Getenv("R2_SECRET_KEY"),
		R2Bucket:       env("R2_BUCKET", "choons"),
		StreamURLTTL:   streamTTL,
		ImageURLTTL:    imageTTL,
		LoginPerMin:    integer("RATE_LIMIT_LOGIN_PER_MINUTE", 10),
		StreamPerMin:   integer("RATE_LIMIT_STREAM_PER_MINUTE", 60),
		TrustedProxies: list(env("TRUSTED_PROXIES", "127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7")),
		AdminUsername:  os.Getenv("ADMIN_USERNAME"),
		AdminPassword:  os.Getenv("ADMIN_PASSWORD"),
	}, nil
}

func databaseURL() (string, error) {
	if v := os.Getenv("DATABASE_URL"); v != "" {
		return v, nil
	}
	raw := os.Getenv("POSTGRES_URI")
	if raw == "" {
		return "", errors.New("DATABASE_URL or POSTGRES_URI must be set")
	}
	return NormalizePostgresURI(raw, os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASS"))
}

func NormalizePostgresURI(raw, user, pass string) (string, error) {
	u, err := url.Parse(strings.TrimPrefix(raw, "jdbc:"))
	if err != nil {
		return "", fmt.Errorf("invalid POSTGRES_URI: %w", err)
	}
	if u.Scheme != "postgres" && u.Scheme != "postgresql" {
		return "", fmt.Errorf("invalid POSTGRES_URI scheme %q", u.Scheme)
	}
	u.Scheme = "postgres"
	if user != "" {
		u.User = url.UserPassword(user, pass)
	}
	return u.String(), nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func list(v string) []string {
	var out []string
	for _, part := range strings.Split(v, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func integer(key string, fallback int) int {
	n, err := strconv.Atoi(os.Getenv(key))
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}

func duration(key string, fallback time.Duration) (time.Duration, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("invalid %s: %w", key, err)
	}
	return d, nil
}
