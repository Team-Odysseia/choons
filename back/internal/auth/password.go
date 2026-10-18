package auth

import "golang.org/x/crypto/bcrypt"

const bcryptCost = 10

var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("timing-equalizer"), bcryptCost)

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
