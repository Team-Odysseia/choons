package httpx

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
)

type ErrorBody struct {
	Error string `json:"error"`
}

func Fail(c *gin.Context, err error) {
	_ = c.Error(err)
	var appErr *apperr.Error
	switch {
	case errors.As(err, &appErr):
		c.AbortWithStatusJSON(appErr.Status, ErrorBody{Error: appErr.Message})
	case errors.Is(err, gorm.ErrDuplicatedKey), errors.Is(err, gorm.ErrForeignKeyViolated):
		c.AbortWithStatusJSON(http.StatusConflict, ErrorBody{Error: "Conflict with existing data"})
	default:
		slog.Error("unhandled error", "method", c.Request.Method, "path", c.FullPath(), "err", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorBody{Error: "Internal server error"})
	}
}

func JSON(c *gin.Context, status int, body any, err error) {
	if err != nil {
		Fail(c, err)
		return
	}
	c.JSON(status, body)
}

func NoContent(c *gin.Context, err error) {
	if err != nil {
		Fail(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
