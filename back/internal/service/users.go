package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
	"github.com/Team-Odysseia/choons/back/internal/auth"
	"github.com/Team-Odysseia/choons/back/internal/dto"
	"github.com/Team-Odysseia/choons/back/internal/model"
)

type Users struct {
	db *gorm.DB
}

func NewUsers(gdb *gorm.DB) *Users { return &Users{db: gdb} }

func (s *Users) Get(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return first[model.User](s.db.WithContext(ctx), "User", id)
}

func (s *Users) byUsername(tx *gorm.DB, username string) (*model.User, error) {
	var u model.User
	err := tx.Where("username = ?", username).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Users) Authenticate(ctx context.Context, username, password string) (*model.User, error) {
	u, err := s.byUsername(s.db.WithContext(ctx), username)
	if err != nil {
		return nil, err
	}
	hash := ""
	if u != nil {
		hash = u.Password
	}
	if !auth.CheckPassword(hash, password) || u == nil {
		return nil, apperr.Unauthorized()
	}
	return u, nil
}

func (s *Users) Register(ctx context.Context, username, password string, role model.Role) (dto.User, error) {
	username = strings.TrimSpace(username)
	hash, err := auth.HashPassword(password)
	if err != nil {
		return dto.User{}, err
	}
	u := model.User{Username: username, Password: hash, Role: role}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		existing, err := s.byUsername(tx, username)
		if err != nil {
			return err
		}
		if existing != nil {
			return apperr.Conflict("Username already exists")
		}
		return tx.Create(&u).Error
	})
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return dto.User{}, apperr.Conflict("Username already exists")
	}
	if err != nil {
		return dto.User{}, err
	}
	return dto.FromUser(&u), nil
}

func (s *Users) EnsureAdmin(ctx context.Context, username, password string) (bool, error) {
	var n int64
	if err := s.db.WithContext(ctx).Model(&model.User{}).Where("role = ?", model.RoleAdmin).Count(&n).Error; err != nil {
		return false, err
	}
	if n > 0 {
		return false, nil
	}
	if _, err := s.Register(ctx, username, password, model.RoleAdmin); err != nil {
		return false, err
	}
	return true, nil
}

func (s *Users) ListListeners(ctx context.Context, query string) ([]dto.Listener, error) {
	q := s.db.WithContext(ctx).Where("role = ?", model.RoleListener).Order("username ASC")
	if f := strings.TrimSpace(query); f != "" {
		q = q.Where("upper(username) LIKE upper(?)", likePattern(f))
	}
	var users []model.User
	if err := q.Find(&users).Error; err != nil {
		return nil, err
	}
	return dto.Map(users, dto.FromListener), nil
}

func (s *Users) listener(tx *gorm.DB, id uuid.UUID) (*model.User, error) {
	u, err := first[model.User](tx, "Listener", id)
	if err != nil {
		return nil, err
	}
	if u.Role != model.RoleListener {
		return nil, apperr.NotFound("Listener not found: %s", id)
	}
	return u, nil
}

func (s *Users) UpdateListener(ctx context.Context, id uuid.UUID, username, password string) (dto.Listener, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return dto.Listener{}, apperr.BadRequest("Username is required")
	}
	var out *model.User
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		u, err := s.listener(tx, id)
		if err != nil {
			return err
		}
		existing, err := s.byUsername(tx, username)
		if err != nil {
			return err
		}
		if existing != nil && existing.ID != u.ID {
			return apperr.BadRequest("Username already in use")
		}
		u.Username = username
		if strings.TrimSpace(password) != "" {
			hash, err := auth.HashPassword(password)
			if err != nil {
				return err
			}
			u.Password = hash
		}
		out = u
		return tx.Model(u).Select("username", "password").Updates(u).Error
	})
	if err != nil {
		return dto.Listener{}, err
	}
	return dto.FromListener(out), nil
}

func (s *Users) DeleteListener(ctx context.Context, id uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if _, err := s.listener(tx, id); err != nil {
			return err
		}
		return tx.Delete(&model.User{}, "id = ?", id).Error
	})
}

func (s *Users) SetRequestBan(ctx context.Context, id uuid.UUID, blocked bool) (dto.Listener, error) {
	var out *model.User
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		u, err := first[model.User](tx, "User", id)
		if err != nil {
			return err
		}
		u.RequestsBlocked = blocked
		out = u
		return tx.Model(u).Update("requests_blocked", blocked).Error
	})
	if err != nil {
		return dto.Listener{}, err
	}
	return dto.FromListener(out), nil
}
