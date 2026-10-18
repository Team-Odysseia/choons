package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

const TokenTTL = 72 * time.Hour

type Claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

type Tokens struct {
	key    []byte
	method jwt.SigningMethod
	now    func() time.Time
}

func NewTokens(secret []byte) (*Tokens, error) {
	if len(secret) < 32 {
		return nil, errors.New("jwt secret must be at least 32 bytes")
	}
	return &Tokens{key: secret, method: methodFor(secret), now: time.Now}, nil
}

func methodFor(secret []byte) jwt.SigningMethod {
	switch {
	case len(secret) >= 64:
		return jwt.SigningMethodHS512
	case len(secret) >= 48:
		return jwt.SigningMethodHS384
	default:
		return jwt.SigningMethodHS256
	}
}

func (t *Tokens) Issue(user *model.User) (string, error) {
	now := t.now()
	claims := Claims{
		Role: string(user.Role),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(TokenTTL)),
		},
	}
	return jwt.NewWithClaims(t.method, claims).SignedString(t.key)
}

func (t *Tokens) Parse(token string) (uuid.UUID, error) {
	var claims Claims
	_, err := jwt.ParseWithClaims(token, &claims, func(*jwt.Token) (any, error) { return t.key, nil },
		jwt.WithValidMethods([]string{"HS256", "HS384", "HS512"}),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(t.now),
	)
	if err != nil {
		return uuid.Nil, fmt.Errorf("parse token: %w", err)
	}
	return uuid.Parse(claims.Subject)
}
