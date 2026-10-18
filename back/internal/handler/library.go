package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
	"github.com/Team-Odysseia/choons/back/internal/httpx"
	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/service"
)

const maxFavoriteCheck = 500

func itoa(n int) string { return strconv.Itoa(n) }

func atoi(s string) (int, error) { return strconv.Atoi(strings.TrimSpace(s)) }

// Admin listeners & requests

func (h *Handler) listListeners(c *gin.Context) {
	out, err := h.Users.ListListeners(c.Request.Context(), c.Query("query"))
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) updateListener(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	var req struct {
		Username string `json:"username" binding:"notblank"`
		Password string `json:"password"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Users.UpdateListener(c.Request.Context(), id, req.Username, req.Password)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) deleteListener(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Users.DeleteListener(c.Request.Context(), id))
}

func (h *Handler) setRequestBan(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	var req struct {
		Blocked bool `json:"blocked"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Users.SetRequestBan(c.Request.Context(), id, req.Blocked)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) adminRequests(c *gin.Context) {
	out, err := h.Library.AllRequests(c.Request.Context())
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) setRequestStatus(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	var req struct {
		Status model.AlbumRequestStatus `json:"status" binding:"required,oneof=PENDING ACCEPTED REJECTED"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Library.SetRequestStatus(c.Request.Context(), id, req.Status)
	httpx.JSON(c, http.StatusOK, out, err)
}

// Listener requests

func (h *Handler) submitRequest(c *gin.Context) {
	var req service.AlbumRequestInput
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Library.SubmitRequest(c.Request.Context(), user(c), req)
	httpx.JSON(c, http.StatusCreated, out, err)
}

func (h *Handler) myRequests(c *gin.Context) {
	out, err := h.Library.MyRequests(c.Request.Context(), user(c))
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) deleteRequest(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Library.DeleteMyRequest(c.Request.Context(), user(c), id))
}

// Favorites

func (h *Handler) favorites(c *gin.Context) {
	out, err := h.Library.Favorites(c.Request.Context(), user(c))
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) addFavorite(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "trackId")
	if !ok {
		return
	}
	out, err := h.Library.AddFavorite(c.Request.Context(), user(c), id)
	httpx.JSON(c, http.StatusCreated, out, err)
}

func (h *Handler) removeFavorite(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "trackId")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Library.RemoveFavorite(c.Request.Context(), user(c), id))
}

func (h *Handler) checkFavorites(c *gin.Context) {
	var trackIDs []uuid.UUID
	for _, raw := range c.QueryArray("trackIds") {
		for _, part := range strings.Split(raw, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			id, err := uuid.Parse(part)
			if err != nil {
				httpx.Fail(c, apperr.BadRequest("Invalid trackIds"))
				return
			}
			trackIDs = append(trackIDs, id)
		}
	}
	if len(trackIDs) > maxFavoriteCheck {
		httpx.Fail(c, apperr.BadRequest("trackIds size must be between 0 and %d", maxFavoriteCheck))
		return
	}
	out, err := h.Library.CheckFavorites(c.Request.Context(), user(c), trackIDs)
	httpx.JSON(c, http.StatusOK, out, err)
}

// Playlists

func (h *Handler) createPlaylist(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"notblank,size=0_120"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Playlists.Create(c.Request.Context(), user(c), req.Name)
	httpx.JSON(c, http.StatusCreated, out, err)
}

func (h *Handler) myPlaylists(c *gin.Context) {
	out, err := h.Playlists.Mine(c.Request.Context(), user(c))
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) publicPlaylists(c *gin.Context) {
	out, err := h.Playlists.Public(c.Request.Context(), user(c))
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) getPlaylist(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	out, err := h.Playlists.Get(c.Request.Context(), user(c), id)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) deletePlaylist(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Playlists.Delete(c.Request.Context(), user(c), id))
}

func (h *Handler) addPlaylistTrack(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	var req struct {
		TrackID *uuid.UUID `json:"trackId" binding:"required"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Playlists.AddTrack(c.Request.Context(), user(c), id, *req.TrackID)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) removePlaylistTrack(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	trackID, ok := httpx.PathUUID(c, "trackId")
	if !ok {
		return
	}
	out, err := h.Playlists.RemoveTrack(c.Request.Context(), user(c), id, trackID)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) setPlaylistVisibility(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	var req struct {
		IsPublic bool `json:"isPublic"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Playlists.SetVisibility(c.Request.Context(), user(c), id, req.IsPublic)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) reorderPlaylist(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	var req struct {
		OrderedTrackIDs []uuid.UUID `json:"orderedTrackIds" binding:"required,notempty"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Playlists.Reorder(c.Request.Context(), user(c), id, req.OrderedTrackIDs)
	httpx.JSON(c, http.StatusOK, out, err)
}
