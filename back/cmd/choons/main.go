package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/Team-Odysseia/choons/back/internal/auth"
	"github.com/Team-Odysseia/choons/back/internal/config"
	"github.com/Team-Odysseia/choons/back/internal/db"
	"github.com/Team-Odysseia/choons/back/internal/handler"
	"github.com/Team-Odysseia/choons/back/internal/httpx"
	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/party"
	"github.com/Team-Odysseia/choons/back/internal/service"
	"github.com/Team-Odysseia/choons/back/internal/storage"
)

const usage = `usage: choons [serve | migrate | health | create-admin <username> <password>]`

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		slog.Warn("could not read .env", "err", err)
	}
	if err := run(os.Args[1:]); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	cmd := "serve"
	if len(args) > 0 {
		cmd = args[0]
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	switch cmd {
	case "serve":
		return serve(ctx)
	case "health":
		return health(ctx)
	case "migrate":
		_, err := openDB(ctx)
		return err
	case "create-admin":
		if len(args) != 3 {
			return errors.New(usage)
		}
		return createAdmin(ctx, args[1], args[2])
	default:
		return errors.New(usage)
	}
}

func health(ctx context.Context) error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://127.0.0.1:"+port+"/healthz", nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unhealthy: %d", resp.StatusCode)
	}
	return nil
}

func openDB(ctx context.Context) (*service.Users, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	gdb, err := db.Open(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	if err := db.Migrate(ctx, gdb); err != nil {
		return nil, err
	}
	return service.NewUsers(gdb), nil
}

func createAdmin(ctx context.Context, username, password string) error {
	if err := auth.ValidatePassword(password); err != nil {
		return err
	}
	users, err := openDB(ctx)
	if err != nil {
		return err
	}
	u, err := users.Register(ctx, username, password, model.RoleAdmin)
	if err != nil {
		return err
	}
	fmt.Printf("created admin %s (%s)\n", u.Username, u.ID)
	return nil
}

func serve(ctx context.Context) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	gdb, err := db.Open(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	if err := db.Migrate(ctx, gdb); err != nil {
		return err
	}
	if err := httpx.RegisterValidators(); err != nil {
		return err
	}
	store, err := storage.NewS3(cfg.R2Endpoint, cfg.R2AccessKey, cfg.R2SecretKey, cfg.R2Bucket)
	if err != nil {
		return err
	}
	tokens, err := auth.NewTokens(cfg.JWTSecret)
	if err != nil {
		return err
	}

	users := service.NewUsers(gdb)
	if cfg.AdminUsername != "" && cfg.AdminPassword != "" {
		created, err := users.EnsureAdmin(ctx, cfg.AdminUsername, cfg.AdminPassword)
		if err != nil {
			return fmt.Errorf("bootstrap admin: %w", err)
		}
		if created {
			slog.Info("bootstrapped admin user", "username", cfg.AdminUsername)
		}
	}

	hub := party.NewHub()
	parties := service.NewParties(gdb, hub)
	h := &handler.Handler{
		DB:         gdb,
		Users:      users,
		Catalog:    service.NewCatalog(gdb, store, service.NewLrclib()),
		Library:    service.NewLibrary(gdb),
		Playlists:  service.NewPlaylists(gdb),
		Parties:    parties,
		Hub:        hub,
		Store:      store,
		Tokens:     tokens,
		Cookie:     auth.Cookie{Name: cfg.CookieName, Secure: cfg.CookieSecure},
		StreamTTL:  cfg.StreamURLTTL,
		ImageTTL:   cfg.ImageURLTTL,
		SSETimeout: 5 * time.Minute,
		Heartbeat:  15 * time.Second,
	}

	gin.SetMode(gin.ReleaseMode)
	loginLimiter := httpx.NewRateLimiter(cfg.LoginPerMin)
	streamLimiter := httpx.NewRateLimiter(cfg.StreamPerMin)
	router, err := h.Router(handler.RouterConfig{
		CORSOrigins:    cfg.CORSOrigins,
		TrustedProxies: cfg.TrustedProxies,
		LoginLimiter:   loginLimiter,
		StreamLimiter:  streamLimiter,
	})
	if err != nil {
		return err
	}

	go loginLimiter.RunJanitor(ctx)
	go streamLimiter.RunJanitor(ctx)
	go parties.RunCleanup(ctx, time.Minute)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       2 * time.Minute,
	}
	errCh := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", srv.Addr)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
	}
	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
