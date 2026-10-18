package httpx

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

const limiterIdleTTL = 10 * time.Minute

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	perMin   int
	visitors map[string]*visitor
	now      func() time.Time
}

func NewRateLimiter(perMinute int) *RateLimiter {
	return &RateLimiter{perMin: perMinute, visitors: map[string]*visitor{}, now: time.Now}
}

func (r *RateLimiter) Allow(key string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	v, ok := r.visitors[key]
	if !ok {
		v = &visitor{limiter: rate.NewLimiter(rate.Limit(float64(r.perMin)/60), r.perMin)}
		r.visitors[key] = v
	}
	v.lastSeen = r.now()
	return v.limiter.AllowN(v.lastSeen, 1)
}

func (r *RateLimiter) evict() {
	r.mu.Lock()
	defer r.mu.Unlock()
	cutoff := r.now().Add(-limiterIdleTTL)
	for k, v := range r.visitors {
		if v.lastSeen.Before(cutoff) {
			delete(r.visitors, k)
		}
	}
}

func (r *RateLimiter) RunJanitor(ctx context.Context) {
	t := time.NewTicker(time.Minute)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			r.evict()
		}
	}
}

func (r *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !r.Allow(c.ClientIP()) {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, ErrorBody{Error: "Too many requests"})
			return
		}
		c.Next()
	}
}
