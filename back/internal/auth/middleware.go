package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/httpx"
	"github.com/Team-Odysseia/choons/back/internal/model"
)

const userKey = "choons.user"

type UserLoader func(ctx context.Context, id uuid.UUID) (*model.User, error)

type Cookie struct {
	Name   string
	Secure bool
}

func (c Cookie) Set(ctx *gin.Context, value string, maxAge int) {
	same := http.SameSiteLaxMode
	if c.Secure {
		same = http.SameSiteNoneMode
	}
	http.SetCookie(ctx.Writer, &http.Cookie{
		Name:     c.Name,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   c.Secure,
		SameSite: same,
	})
}

func (c Cookie) Clear(ctx *gin.Context) {
	c.Set(ctx, "", -1)
}

func Authenticate(tokens *Tokens, cookie Cookie, load UserLoader) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearer(c.GetHeader("Authorization"))
		if token == "" {
			token, _ = c.Cookie(cookie.Name)
		}
		if token == "" {
			c.Next()
			return
		}
		id, err := tokens.Parse(token)
		if err != nil {
			c.Next()
			return
		}
		user, err := load(c.Request.Context(), id)
		if err == nil && user != nil {
			c.Set(userKey, user)
		}
		c.Next()
	}
}

func bearer(header string) string {
	if v, ok := strings.CutPrefix(header, "Bearer "); ok {
		return strings.TrimSpace(v)
	}
	return ""
}

func CurrentUser(c *gin.Context) *model.User {
	v, ok := c.Get(userKey)
	if !ok {
		return nil
	}
	u, _ := v.(*model.User)
	return u
}

func RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if CurrentUser(c) == nil {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		c.Next()
	}
}

func RequireRole(role model.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		u := CurrentUser(c)
		if u == nil {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		if u.Role != role {
			c.AbortWithStatusJSON(http.StatusForbidden, httpx.ErrorBody{Error: "Access Denied"})
			return
		}
		c.Next()
	}
}
