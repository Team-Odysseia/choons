package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/httpx"
	"github.com/Team-Odysseia/choons/back/internal/service"
)

func (h *Handler) createParty(c *gin.Context) {
	var req service.CreatePartyInput
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Parties.Create(c.Request.Context(), user(c), req)
	httpx.JSON(c, http.StatusCreated, out, err)
}

func (h *Handler) joinParty(c *gin.Context) {
	var req struct {
		InviteCode string `json:"inviteCode" binding:"notblank,size=8_8"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Parties.Join(c.Request.Context(), user(c), req.InviteCode)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) myParty(c *gin.Context) {
	out, err := h.Parties.Mine(c.Request.Context(), user(c))
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) partyState(c *gin.Context) {
	out, err := h.Parties.State(c.Request.Context(), user(c), c.Param("code"))
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) leaveParty(c *gin.Context) {
	httpx.NoContent(c, h.Parties.Leave(c.Request.Context(), user(c), c.Param("code")))
}

func (h *Handler) endParty(c *gin.Context) {
	httpx.NoContent(c, h.Parties.End(c.Request.Context(), user(c), c.Param("code")))
}

func (h *Handler) kickMember(c *gin.Context) {
	target, ok := httpx.PathUUID(c, "userId")
	if !ok {
		return
	}
	out, err := h.Parties.Kick(c.Request.Context(), user(c), c.Param("code"), target)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) setMemberDJ(c *gin.Context) {
	target, ok := httpx.PathUUID(c, "userId")
	if !ok {
		return
	}
	var req struct {
		DJ bool `json:"dj"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Parties.SetDJ(c.Request.Context(), user(c), c.Param("code"), target, req.DJ)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) queueTrack(c *gin.Context) {
	var req struct {
		TrackID *uuid.UUID `json:"trackId" binding:"required"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Parties.AddTracks(c.Request.Context(), user(c), c.Param("code"), []uuid.UUID{*req.TrackID})
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) queueTracks(c *gin.Context) {
	var req struct {
		TrackIDs []uuid.UUID `json:"trackIds" binding:"required,notempty,max=2000"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Parties.AddTracks(c.Request.Context(), user(c), c.Param("code"), req.TrackIDs)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) removeQueueItem(c *gin.Context) {
	itemID, ok := httpx.PathUUID(c, "itemId")
	if !ok {
		return
	}
	out, err := h.Parties.RemoveItem(c.Request.Context(), user(c), c.Param("code"), itemID)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) reorderQueue(c *gin.Context) {
	var req struct {
		OrderedItemIDs []uuid.UUID `json:"orderedItemIds" binding:"required,max=2000"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Parties.Reorder(c.Request.Context(), user(c), c.Param("code"), req.OrderedItemIDs)
	httpx.JSON(c, http.StatusOK, out, err)
}

type positionRequest struct {
	PositionSec float64 `json:"positionSec" binding:"gte=0"`
}

func (h *Handler) play(c *gin.Context) {
	var req struct {
		TrackID     *uuid.UUID `json:"trackId" binding:"required"`
		PositionSec float64    `json:"positionSec" binding:"gte=0"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Parties.Play(c.Request.Context(), user(c), c.Param("code"), *req.TrackID, req.PositionSec)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) pause(c *gin.Context) {
	var req positionRequest
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Parties.Pause(c.Request.Context(), user(c), c.Param("code"), req.PositionSec)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) seek(c *gin.Context) {
	var req positionRequest
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Parties.Seek(c.Request.Context(), user(c), c.Param("code"), req.PositionSec)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) next(c *gin.Context) {
	out, err := h.Parties.Next(c.Request.Context(), user(c), c.Param("code"))
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) prev(c *gin.Context) {
	out, err := h.Parties.Prev(c.Request.Context(), user(c), c.Param("code"))
	httpx.JSON(c, http.StatusOK, out, err)
}

func writeEvent(w io.Writer, name string, data []byte) error {
	_, err := fmt.Fprintf(w, "event:%s\ndata:%s\n\n", name, data)
	return err
}

func (h *Handler) partyEvents(c *gin.Context) {
	code := c.Param("code")
	sub := h.Hub.Subscribe(code)
	defer h.Hub.Unsubscribe(sub)

	state, err := h.Parties.State(c.Request.Context(), user(c), code)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	initial, err := json.Marshal(state)
	if err != nil {
		httpx.Fail(c, err)
		return
	}

	w := c.Writer
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	if writeEvent(w, "state", initial) != nil {
		return
	}
	w.Flush()

	timeout := time.NewTimer(h.SSETimeout)
	defer timeout.Stop()
	heartbeat := time.NewTicker(h.Heartbeat)
	defer heartbeat.Stop()
	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-timeout.C:
			return
		case <-h.Closing:
			return
		case <-heartbeat.C:
			if writeEvent(w, "heartbeat", []byte("ok")) != nil {
				return
			}
		case ev, ok := <-sub.C:
			if !ok {
				return
			}
			if writeEvent(w, ev.Name, ev.Data) != nil {
				return
			}
			if ev.Name == "ended" {
				w.Flush()
				return
			}
		}
		w.Flush()
	}
}
