package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/Team-Odysseia/choons/back/internal/auth"
	"github.com/Team-Odysseia/choons/back/internal/httpx"
	"github.com/Team-Odysseia/choons/back/internal/model"
)

type RouterConfig struct {
	CORSOrigins    []string
	TrustedProxies []string
	LoginLimiter   *httpx.RateLimiter
	StreamLimiter  *httpx.RateLimiter
}

func (h *Handler) Router(cfg RouterConfig) (*gin.Engine, error) {
	r := gin.New()
	r.MaxMultipartMemory = multipartMemory
	if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return nil, err
	}
	r.Use(gin.Recovery())
	r.Use(httpx.CORS(cfg.CORSOrigins))
	guard, err := httpx.CrossOriginGuard(cfg.CORSOrigins)
	if err != nil {
		return nil, err
	}
	r.Use(guard)
	r.Use(limitBody)
	r.Use(auth.Authenticate(h.Tokens, h.Cookie, h.Users.Get))
	r.NoRoute(notFound)

	r.GET("/healthz", healthz(h.DB))
	r.POST("/auth/login", cfg.LoginLimiter.Middleware(), h.login)
	r.POST("/auth/logout", h.logout)
	r.GET("/public/covers", h.publicCovers)
	r.GET("/media/images/albums/:id", h.image("albums"))

	authed := r.Group("", auth.RequireUser())
	authed.GET("/auth/me", h.me)
	authed.GET("/media/images/artists/:id", h.image("artists"))

	music := authed.Group("/music")
	music.GET("/artists", h.listArtists)
	music.GET("/artists/:id", h.getArtist)
	music.GET("/albums", h.listAlbums)
	music.GET("/albums/:id", h.getAlbum)
	music.GET("/tracks", h.listTracks)
	music.GET("/tracks/most-played", h.mostPlayed)
	music.GET("/tracks/:id", h.getTrack)

	stream := authed.Group("/stream", cfg.StreamLimiter.Middleware())
	stream.GET("/:id", h.stream)
	stream.POST("/:id/played", h.played)

	fav := authed.Group("/favorites")
	fav.GET("", h.favorites)
	fav.GET("/check", h.checkFavorites)
	fav.POST("/:trackId", h.addFavorite)
	fav.DELETE("/:trackId", h.removeFavorite)

	pl := authed.Group("/playlists")
	pl.POST("", h.createPlaylist)
	pl.GET("", h.myPlaylists)
	pl.GET("/public", h.publicPlaylists)
	pl.GET("/:id", h.getPlaylist)
	pl.DELETE("/:id", h.deletePlaylist)
	pl.POST("/:id/tracks", h.addPlaylistTrack)
	pl.DELETE("/:id/tracks/:trackId", h.removePlaylistTrack)
	pl.PUT("/:id/visibility", h.setPlaylistVisibility)
	pl.PUT("/:id/tracks/order", h.reorderPlaylist)

	pa := authed.Group("/parties")
	pa.POST("", h.createParty)
	pa.POST("/join", h.joinParty)
	pa.GET("/me", h.myParty)
	pa.GET("/:code/state", h.partyState)
	pa.GET("/:code/events", h.partyEvents)
	pa.POST("/:code/leave", h.leaveParty)
	pa.POST("/:code/end", h.endParty)
	pa.POST("/:code/members/:userId/kick", h.kickMember)
	pa.POST("/:code/members/:userId/dj", h.setMemberDJ)
	pa.POST("/:code/queue", h.queueTrack)
	pa.POST("/:code/queue/batch", h.queueTracks)
	pa.DELETE("/:code/queue/:itemId", h.removeQueueItem)
	pa.PUT("/:code/queue/reorder", h.reorderQueue)
	pa.POST("/:code/playback/play", h.play)
	pa.POST("/:code/playback/pause", h.pause)
	pa.POST("/:code/playback/seek", h.seek)
	pa.POST("/:code/playback/next", h.next)
	pa.POST("/:code/playback/prev", h.prev)

	listener := r.Group("/album-requests", auth.RequireRole(model.RoleListener))
	listener.POST("", h.submitRequest)
	listener.GET("/mine", h.myRequests)
	listener.DELETE("/:id", h.deleteRequest)

	r.POST("/auth/register", auth.RequireRole(model.RoleAdmin), h.register)
	admin := r.Group("/admin", auth.RequireRole(model.RoleAdmin))
	admin.GET("/listeners", h.listListeners)
	admin.PUT("/listeners/:id", h.updateListener)
	admin.DELETE("/listeners/:id", h.deleteListener)
	admin.PUT("/listeners/:id/request-ban", h.setRequestBan)
	admin.GET("/album-requests", h.adminRequests)
	admin.PUT("/album-requests/:id/status", h.setRequestStatus)

	admin.GET("/artists", h.adminListArtists)
	admin.GET("/artists/:id", h.getArtist)
	admin.POST("/artists", h.createArtist)
	admin.PUT("/artists/:id", h.updateArtist)
	admin.DELETE("/artists/:id", h.deleteArtist)
	admin.DELETE("/artists/:id/avatar", h.deleteArtistAvatar)

	admin.GET("/albums", h.adminListAlbums)
	admin.GET("/albums/:id", h.getAlbum)
	admin.POST("/albums", h.createAlbum)
	admin.PUT("/albums/:id", h.updateAlbum)
	admin.DELETE("/albums/:id", h.deleteAlbum)
	admin.DELETE("/albums/:id/cover", h.deleteAlbumCover)
	admin.PUT("/albums/:id/tracks", h.updateAlbumTracks)

	admin.GET("/tracks", h.adminListTracks)
	admin.POST("/tracks", h.uploadTrack)
	admin.POST("/tracks/batch", h.uploadBatch)
	admin.PUT("/tracks/:id", h.updateTrack)
	admin.PUT("/tracks/:id/lrclib-id", h.updateLrclib)
	admin.DELETE("/tracks/:id", h.deleteTrack)

	return r, nil
}
