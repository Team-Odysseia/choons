package telemetry

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/posthog/posthog-go"

	"github.com/Team-Odysseia/choons/back/internal/httpx"
)

const (
	EventRequestFailed = "api_request_failed"
	EventRequestSlow   = "api_request_slow"

	sessionHeader  = "X-POSTHOG-SESSION-ID"
	distinctHeader = "X-POSTHOG-DISTINCT-ID"
	service        = "choons-back"
	anonymous      = "anonymous"
)

type User struct {
	ID   string
	Role string
}

type Options struct {
	Client      posthog.EnqueueClient
	Environment string
	Slow        time.Duration
	SkipSlow    func(*gin.Context) bool
	User        func(*gin.Context) (User, bool)
}

type outcome struct {
	requestID string
	elapsed   time.Duration
	status    int
	panic     *posthog.ExceptionItem
}

func Middleware(opts Options) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := uuid.NewString()
		c.Header(httpx.RequestIDHeader, requestID)
		start := time.Now()
		defer func() {
			rec := recover()
			if rec == http.ErrAbortHandler {
				panic(rec)
			}
			result := outcome{requestID: requestID, elapsed: time.Since(start), status: c.Writer.Status()}
			if rec != nil {
				result.status = http.StatusInternalServerError
				result.panic = panicItem(rec)
				slog.Error("panic recovered", "method", c.Request.Method, "path", c.FullPath(), "request_id", requestID, "panic", rec)
				if c.Writer.Written() {
					c.Abort()
				} else {
					c.AbortWithStatusJSON(http.StatusInternalServerError, httpx.ErrorBody{Error: "Internal server error"})
				}
			}
			opts.report(c, result)
		}()
		c.Next()
	}
}

func panicItem(rec any) *posthog.ExceptionItem {
	handled := false
	extractor := posthog.DefaultStackTraceExtractor{InAppDecider: posthog.SimpleInAppDecider}
	return &posthog.ExceptionItem{
		Type:       "panic",
		Value:      fmt.Sprint(rec),
		Mechanism:  &posthog.ExceptionMechanism{Handled: &handled},
		Stacktrace: extractor.GetStackTrace(3),
	}
}

func (o Options) report(c *gin.Context, r outcome) {
	if o.Client == nil {
		return
	}
	route := c.FullPath()
	distinctID, props := o.identify(c)
	props.
		Set("service", service).
		Set("environment", o.Environment).
		Set("method", c.Request.Method).
		Set("route", route).
		Set("status", r.status).
		Set("duration_ms", r.elapsed.Milliseconds()).
		Set("request_id", r.requestID)
	if session := c.GetHeader(sessionHeader); session != "" {
		props.Set("$session_id", session)
	}

	switch {
	case r.panic != nil:
		o.enqueue(posthog.Exception{DistinctId: distinctID, Properties: props, ExceptionList: []posthog.ExceptionItem{*r.panic}})
	case r.status >= http.StatusInternalServerError:
		item := posthog.ExceptionItem{Type: c.Request.Method + " " + route, Value: lastError(c, r.status)}
		o.enqueue(posthog.Exception{DistinctId: distinctID, Properties: props, ExceptionList: []posthog.ExceptionItem{item}})
	case r.status >= http.StatusBadRequest && r.status != http.StatusUnauthorized && route != "":
		failed := posthog.NewProperties().Merge(props).Set("error", lastError(c, r.status))
		o.enqueue(posthog.Capture{DistinctId: distinctID, Event: EventRequestFailed, Properties: failed})
	}

	if o.Slow > 0 && r.elapsed > o.Slow && route != "" && (o.SkipSlow == nil || !o.SkipSlow(c)) {
		o.enqueue(posthog.Capture{DistinctId: distinctID, Event: EventRequestSlow, Properties: posthog.NewProperties().Merge(props)})
	}
}

func (o Options) identify(c *gin.Context) (string, posthog.Properties) {
	props := posthog.NewProperties()
	if o.User != nil {
		if u, ok := o.User(c); ok {
			return u.ID, props.Set("user_role", u.Role)
		}
	}
	props.Set("$process_person_profile", false)
	if id := c.GetHeader(distinctHeader); id != "" {
		return id, props
	}
	return anonymous, props
}

func lastError(c *gin.Context, status int) string {
	if err := c.Errors.Last(); err != nil {
		return err.Error()
	}
	return fmt.Sprintf("HTTP %d", status)
}

func (o Options) enqueue(m posthog.Message) {
	if err := o.Client.Enqueue(m); err != nil {
		slog.Warn("telemetry enqueue failed", "err", err)
	}
}
