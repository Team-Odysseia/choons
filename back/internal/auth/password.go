package auth

import (
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
)

const (
	bcryptCost        = 10
	minPasswordRunes  = 6
	maxPasswordBytes  = 72
	passwordPolicyMsg = "Password must be at least 6 characters and at most 72 bytes"
)

var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("timing-equalizer"), bcryptCost)

func ValidatePassword(plain string) error {
	if utf8.RuneCountInString(plain) < minPasswordRunes || len(plain) > maxPasswordBytes {
		return apperr.BadRequest(passwordPolicyMsg)
	}
	return nil
}

func HashPassword(plain string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(plain), bcryptCost)
	return string(h), err
}

func CheckPassword(hash, plain string) bool {
	if hash == "" {
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(plain))
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
