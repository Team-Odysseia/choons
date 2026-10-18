package apperr

import (
	"fmt"
	"net/http"
)

type Error struct {
	Status  int
	Message string
}

func (e *Error) Error() string { return e.Message }

func New(status int, message string) *Error {
	return &Error{Status: status, Message: message}
}

func BadRequest(format string, args ...any) *Error {
	return New(http.StatusBadRequest, fmt.Sprintf(format, args...))
}

func NotFound(format string, args ...any) *Error {
	return New(http.StatusNotFound, fmt.Sprintf(format, args...))
}

func Forbidden(message string) *Error {
	return New(http.StatusForbidden, message)
}

func Conflict(message string) *Error {
	return New(http.StatusConflict, message)
}

func Unauthorized() *Error {
	return New(http.StatusUnauthorized, "Invalid credentials")
}

var AccessDenied = Forbidden("Access denied")
