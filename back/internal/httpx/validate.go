package httpx

import (
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
)

var httpURL = regexp.MustCompile(`^https?://.+`)

func RegisterValidators() error {
	v, ok := binding.Validator.Engine().(*validator.Validate)
	if !ok {
		return errors.New("unexpected validator engine")
	}
	v.RegisterTagNameFunc(func(f reflect.StructField) string {
		name, _, _ := strings.Cut(f.Tag.Get("json"), ",")
		if name == "" || name == "-" {
			name, _, _ = strings.Cut(f.Tag.Get("form"), ",")
		}
		if name == "" {
			return f.Name
		}
		return name
	})
	registrations := map[string]validator.Func{
		"notblank": func(fl validator.FieldLevel) bool {
			return strings.TrimSpace(fl.Field().String()) != ""
		},
		"notempty": func(fl validator.FieldLevel) bool {
			return fl.Field().Len() > 0
		},
		"size": func(fl validator.FieldLevel) bool {
			lo, hi, err := sizeBounds(fl.Param())
			if err != nil {
				return false
			}
			f := fl.Field()
			n := f.Len()
			if f.Kind() == reflect.String {
				n = utf8.RuneCountInString(f.String())
			}
			return n >= lo && n <= hi
		},
		"httpurl": func(fl validator.FieldLevel) bool {
			return httpURL.MatchString(fl.Field().String())
		},
	}
	for tag, fn := range registrations {
		if err := v.RegisterValidation(tag, fn); err != nil {
			return err
		}
	}
	return nil
}

func sizeBounds(param string) (int, int, error) {
	loS, hiS, ok := strings.Cut(param, "_")
	if !ok {
		return 0, 0, fmt.Errorf("invalid size param %q", param)
	}
	lo, err := strconv.Atoi(loS)
	if err != nil {
		return 0, 0, err
	}
	hi, err := strconv.Atoi(hiS)
	if err != nil {
		return 0, 0, err
	}
	return lo, hi, nil
}

func fieldMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "notblank":
		return "must not be blank"
	case "required":
		return "must not be null"
	case "notempty":
		return "must not be empty"
	case "size":
		lo, hi, _ := sizeBounds(fe.Param())
		return fmt.Sprintf("size must be between %d and %d", lo, hi)
	case "gte":
		return "must be greater than or equal to " + fe.Param()
	case "httpurl":
		return fe.Field() + " must be a valid http/https URL"
	case "oneof":
		return "must be one of [" + strings.ReplaceAll(fe.Param(), " ", ", ") + "]"
	case "max":
		return "must contain at most " + fe.Param() + " elements"
	default:
		return "is invalid"
	}
}

func ValidationError(err error) error {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return apperr.New(http.StatusRequestEntityTooLarge, "Request body too large")
	}
	var ve validator.ValidationErrors
	if errors.As(err, &ve) && len(ve) > 0 {
		fe := ve[0]
		return apperr.BadRequest("%s %s", fe.Field(), fieldMessage(fe))
	}
	return apperr.BadRequest("Malformed request body")
}

func BindJSON(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		Fail(c, ValidationError(err))
		return false
	}
	return true
}

func Validate(dst any) error {
	if err := binding.Validator.ValidateStruct(dst); err != nil {
		return ValidationError(err)
	}
	return nil
}

func PathUUID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		Fail(c, apperr.BadRequest("Invalid %s", name))
		return uuid.Nil, false
	}
	return id, true
}
