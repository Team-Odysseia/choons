package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const allowedMethods = "GET,POST,PUT,DELETE,OPTIONS"

func CORS(origins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(origins))
	for _, o := range origins {
		allowed[o] = struct{}{}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Next()
			return
		}
		h := c.Writer.Header()
		h.Add("Vary", "Origin")
		_, ok := allowed[origin]
		preflight := c.Request.Method == http.MethodOptions && c.GetHeader("Access-Control-Request-Method") != ""
		if !ok {
			if preflight {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
			c.Next()
			return
		}
		h.Set("Access-Control-Allow-Origin", origin)
		h.Set("Access-Control-Allow-Credentials", "true")
		if preflight {
			h.Add("Vary", "Access-Control-Request-Method")
			h.Add("Vary", "Access-Control-Request-Headers")
			h.Set("Access-Control-Allow-Methods", allowedMethods)
			if req := c.GetHeader("Access-Control-Request-Headers"); req != "" {
				h.Set("Access-Control-Allow-Headers", req)
			}
			c.AbortWithStatus(http.StatusOK)
			return
		}
		c.Next()
	}
}
