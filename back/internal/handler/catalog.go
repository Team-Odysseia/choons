package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
	"github.com/Team-Odysseia/choons/back/internal/dto"
	"github.com/Team-Odysseia/choons/back/internal/httpx"
	"github.com/Team-Odysseia/choons/back/internal/model"
	"github.com/Team-Odysseia/choons/back/internal/service"
)

type loginRequest struct {
	Username string `json:"username" binding:"notblank,size=0_80"`
	Password string `json:"password" binding:"notblank,size=6_160"`
}

func (h *Handler) login(c *gin.Context) {
	var req loginRequest
	if !httpx.BindJSON(c, &req) {
		return
	}
	u, err := h.Users.Authenticate(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	token, err := h.Tokens.Issue(u)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	h.Cookie.Set(c, token, authCookieAge)
	c.Status(http.StatusOK)
}

func (h *Handler) logout(c *gin.Context) {
	h.Cookie.Clear(c)
	c.Status(http.StatusNoContent)
}

func (h *Handler) register(c *gin.Context) {
	var req loginRequest
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Users.Register(c.Request.Context(), req.Username, req.Password, model.RoleListener)
	httpx.JSON(c, http.StatusCreated, out, err)
}

func (h *Handler) me(c *gin.Context) {
	c.JSON(http.StatusOK, dto.FromUser(user(c)))
}

func (h *Handler) listArtists(c *gin.Context) {
	p, err := page(c)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	out, err := h.Catalog.ListArtists(c.Request.Context(), c.Query("query"), p)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) getArtist(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	out, err := h.Catalog.GetArtist(c.Request.Context(), id)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) listAlbums(c *gin.Context) {
	artistID, err := queryUUID(c, "artistId")
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	p, err := page(c)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	out, err := h.Catalog.ListAlbums(c.Request.Context(), artistID, c.Query("query"), p)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) getAlbum(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	out, err := h.Catalog.GetAlbum(c.Request.Context(), id)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) listTracks(c *gin.Context) {
	albumID, err := queryUUID(c, "albumId")
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	p, err := page(c)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	out, err := h.Catalog.ListTracks(c.Request.Context(), albumID, c.Query("query"), p)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) getTrack(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	out, err := h.Catalog.GetTrack(c.Request.Context(), id)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) mostPlayed(c *gin.Context) {
	limit, err := queryInt(c, "limit", 10)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	out, err := h.Catalog.MostPlayed(c.Request.Context(), limit)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) stream(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	key, err := h.Catalog.TrackKey(c.Request.Context(), id)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	if key == model.PendingKey {
		httpx.Fail(c, apperr.NotFound("Track audio not available: %s", id))
		return
	}
	url, err := h.Store.PresignGet(c.Request.Context(), key, h.StreamTTL)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.Redirect(http.StatusFound, url)
}

func (h *Handler) played(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Catalog.RecordPlay(c.Request.Context(), user(c).ID, id))
}

func (h *Handler) image(kind string) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := httpx.PathUUID(c, "id")
		if !ok {
			return
		}
		key, err := h.Catalog.ImageKey(c.Request.Context(), kind, id)
		if err != nil {
			httpx.Fail(c, err)
			return
		}
		if key == nil {
			c.Status(http.StatusNotFound)
			return
		}
		url, err := h.Store.PresignGet(c.Request.Context(), *key, h.ImageTTL)
		if err != nil {
			httpx.Fail(c, err)
			return
		}
		c.Header("Cache-Control", "private, max-age="+itoa(int(h.ImageTTL.Seconds()/2)))
		c.Redirect(http.StatusFound, url)
	}
}

func (h *Handler) publicCovers(c *gin.Context) {
	out, err := h.Catalog.RandomCoverIDs(c.Request.Context(), 24)
	httpx.JSON(c, http.StatusOK, out, err)
}

// Admin catalog

func (h *Handler) adminListArtists(c *gin.Context) {
	out, err := h.Catalog.ListArtists(c.Request.Context(), "", nil)
	httpx.JSON(c, http.StatusOK, out, err)
}

func artistInput(f *form) service.ArtistInput {
	return service.ArtistInput{Name: f.str("name"), Bio: f.optStr("bio"), Avatar: f.file("avatarFile", false)}
}

func (h *Handler) createArtist(c *gin.Context) {
	f := newForm(c)
	in := artistInput(f)
	if f.err != nil {
		httpx.Fail(c, f.err)
		return
	}
	out, err := h.Catalog.CreateArtist(c.Request.Context(), in)
	httpx.JSON(c, http.StatusCreated, out, err)
}

func (h *Handler) updateArtist(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	f := newForm(c)
	in := artistInput(f)
	if f.err != nil {
		httpx.Fail(c, f.err)
		return
	}
	out, err := h.Catalog.UpdateArtist(c.Request.Context(), id, in)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) deleteArtist(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Catalog.DeleteArtist(c.Request.Context(), id))
}

func (h *Handler) deleteArtistAvatar(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Catalog.DeleteArtistAvatar(c.Request.Context(), id))
}

func (h *Handler) adminListAlbums(c *gin.Context) {
	artistID, err := queryUUID(c, "artistId")
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	out, err := h.Catalog.ListAlbums(c.Request.Context(), artistID, "", nil)
	httpx.JSON(c, http.StatusOK, out, err)
}

func albumInput(f *form) service.AlbumInput {
	return service.AlbumInput{Title: f.str("title"), ArtistID: f.id("artistId"), ReleaseYear: f.integer("releaseYear", nil), Cover: f.file("coverFile", false)}
}

func (h *Handler) createAlbum(c *gin.Context) {
	f := newForm(c)
	in := albumInput(f)
	if f.err != nil {
		httpx.Fail(c, f.err)
		return
	}
	out, err := h.Catalog.CreateAlbum(c.Request.Context(), in)
	httpx.JSON(c, http.StatusCreated, out, err)
}

func (h *Handler) updateAlbum(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	f := newForm(c)
	in := albumInput(f)
	if f.err != nil {
		httpx.Fail(c, f.err)
		return
	}
	out, err := h.Catalog.UpdateAlbum(c.Request.Context(), id, in)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) deleteAlbum(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Catalog.DeleteAlbum(c.Request.Context(), id))
}

func (h *Handler) deleteAlbumCover(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Catalog.DeleteAlbumCover(c.Request.Context(), id))
}

func (h *Handler) updateAlbumTracks(c *gin.Context) {
	albumID, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	var updates []service.TrackUpdate
	if err := json.NewDecoder(c.Request.Body).Decode(&updates); err != nil {
		httpx.Fail(c, apperr.BadRequest("Malformed request body"))
		return
	}
	for i := range updates {
		if err := httpx.Validate(&updates[i]); err != nil {
			httpx.Fail(c, err)
			return
		}
	}
	out, err := h.Catalog.UpdateAlbumTracks(c.Request.Context(), albumID, updates)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) adminListTracks(c *gin.Context) {
	albumID, err := queryUUID(c, "albumId")
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	out, err := h.Catalog.ListTracks(c.Request.Context(), albumID, "", nil)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) uploadTrack(c *gin.Context) {
	f := newForm(c)
	zero := 0
	in := service.TrackInput{
		Title:           f.str("title"),
		AlbumID:         f.id("albumId"),
		ArtistID:        f.id("artistId"),
		TrackNumber:     f.integer("trackNumber", nil),
		DurationSeconds: f.integer("durationSeconds", &zero),
		Audio:           f.file("audioFile", true),
	}
	if f.err != nil {
		httpx.Fail(c, f.err)
		return
	}
	out, err := h.Catalog.UploadTrack(c.Request.Context(), in)
	httpx.JSON(c, http.StatusCreated, out, err)
}

func (h *Handler) uploadBatch(c *gin.Context) {
	f := newForm(c)
	albumID, artistID := f.id("albumId"), f.id("artistId")
	titles, durations, files := f.list("titles"), f.list("durations"), f.files("files")
	if f.err != nil {
		httpx.Fail(c, f.err)
		return
	}
	if len(files) != len(titles) || len(files) != len(durations) {
		httpx.Fail(c, apperr.BadRequest("Mismatched batch upload lists: files=%d titles=%d durations=%d", len(files), len(titles), len(durations)))
		return
	}
	inputs := make([]service.TrackInput, len(files))
	for i := range files {
		d, err := atoi(durations[i])
		if err != nil {
			httpx.Fail(c, apperr.BadRequest("durations must be numbers"))
			return
		}
		inputs[i] = service.TrackInput{Title: titles[i], AlbumID: albumID, ArtistID: artistID, TrackNumber: i + 1, DurationSeconds: d, Audio: files[i]}
	}
	out, err := h.Catalog.UploadTracks(c.Request.Context(), inputs)
	httpx.JSON(c, http.StatusCreated, out, err)
}

func (h *Handler) updateTrack(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	var req service.TrackUpdate
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Catalog.UpdateTrack(c.Request.Context(), id, req.Title, req.TrackNumber)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) updateLrclib(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	var req struct {
		LrclibID *int `json:"lrclibId"`
	}
	if !httpx.BindJSON(c, &req) {
		return
	}
	out, err := h.Catalog.UpdateLrclibID(c.Request.Context(), id, req.LrclibID)
	httpx.JSON(c, http.StatusOK, out, err)
}

func (h *Handler) deleteTrack(c *gin.Context) {
	id, ok := httpx.PathUUID(c, "id")
	if !ok {
		return
	}
	httpx.NoContent(c, h.Catalog.DeleteTrack(c.Request.Context(), id))
}
