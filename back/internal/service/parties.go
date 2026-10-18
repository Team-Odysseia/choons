package service

import (
	"context"
	"crypto/rand"
	"errors"
	"log/slog"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/Team-Odysseia/choons/back/internal/apperr"
	"github.com/Team-Odysseia/choons/back/internal/dto"
	"github.com/Team-Odysseia/choons/back/internal/model"
)

const (
	inviteAlphabet     = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	inviteLength       = 8
	partyIdleWindow    = 5 * time.Minute
	unknownDurationCap = 2 * time.Hour
)

type PartyPublisher interface {
	PublishState(code string, state dto.PartyState)
	PublishEnded(code string)
	PublishRemoved(code string, user uuid.UUID)
}

type Parties struct {
	db  *gorm.DB
	pub PartyPublisher
	now func() time.Time
}

func NewParties(gdb *gorm.DB, pub PartyPublisher) *Parties {
	return &Parties{db: gdb, pub: pub, now: time.Now}
}

type removal struct {
	code string
	user uuid.UUID
}

type outbox struct {
	states  map[string]dto.PartyState
	ended   []string
	removed []removal
}

func newOutbox() *outbox { return &outbox{states: map[string]dto.PartyState{}} }

func (s *Parties) flush(o *outbox) {
	for _, r := range o.removed {
		s.pub.PublishRemoved(r.code, r.user)
	}
	for _, code := range o.ended {
		delete(o.states, code)
		s.pub.PublishEnded(code)
	}
	for code, st := range o.states {
		s.pub.PublishState(code, st)
	}
}

func (s *Parties) inTx(ctx context.Context, fn func(tx *gorm.DB, o *outbox) error) error {
	o := newOutbox()
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error { return fn(tx, o) }); err != nil {
		return err
	}
	s.flush(o)
	return nil
}

func (s *Parties) nowMs() int64 { return s.now().UnixMilli() }

func generateInviteCode() (string, error) {
	var b strings.Builder
	max := big.NewInt(int64(len(inviteAlphabet)))
	for range inviteLength {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		b.WriteByte(inviteAlphabet[n.Int64()])
	}
	return b.String(), nil
}

func (s *Parties) activeParty(tx *gorm.DB, code string, lock bool) (*model.Party, error) {
	q := tx
	if lock {
		q = q.Clauses(lockForUpdate())
	}
	var p model.Party
	err := q.Where("invite_code = ? AND status = ?", strings.ToUpper(strings.TrimSpace(code)), model.PartyActive).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, apperr.NotFound("Party not found")
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Parties) member(tx *gorm.DB, partyID, userID uuid.UUID) (*model.PartyMember, error) {
	var m model.PartyMember
	err := tx.Where("party_id = ? AND user_id = ?", partyID, userID).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *Parties) requireMember(tx *gorm.DB, p *model.Party, user *model.User) (*model.PartyMember, error) {
	m, err := s.member(tx, p.ID, user.ID)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, apperr.Forbidden("User is not in party")
	}
	return m, nil
}

func (s *Parties) requireHost(tx *gorm.DB, p *model.Party, user *model.User) error {
	m, err := s.requireMember(tx, p, user)
	if err != nil {
		return err
	}
	if !m.Host {
		return apperr.Forbidden("Only host can perform this action")
	}
	return nil
}

func (s *Parties) requireControl(tx *gorm.DB, p *model.Party, user *model.User) error {
	m, err := s.requireMember(tx, p, user)
	if err != nil {
		return err
	}
	if m.Host || m.DJ || p.QueuePolicy == model.PolicyEveryone {
		return nil
	}
	return apperr.Forbidden("Only DJs can control queue in this party")
}

func (s *Parties) playback(tx *gorm.DB, partyID uuid.UUID) (*model.PartyPlaybackState, error) {
	var st model.PartyPlaybackState
	err := tx.Where("party_id = ?", partyID).First(&st).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		st = model.PartyPlaybackState{PartyID: partyID, AnchorEpochMs: s.nowMs()}
		return &st, tx.Omit("Track").Create(&st).Error
	}
	if err != nil {
		return nil, err
	}
	return &st, nil
}

func (s *Parties) savePlayback(tx *gorm.DB, st *model.PartyPlaybackState, item, trackID *uuid.UUID, playing bool, pos float64) error {
	st.QueueItemID, st.TrackID, st.Playing, st.AnchorPositionSec, st.AnchorEpochMs = item, trackID, playing, max(pos, 0), s.nowMs()
	return tx.Model(st).Select("queue_item_id", "track_id", "playing", "anchor_position_sec", "anchor_epoch_ms", "updated_at").Updates(st).Error
}

func playingItem(st *model.PartyPlaybackState, items []model.PartyQueueItem) *model.PartyQueueItem {
	for i := range items {
		if st.QueueItemID != nil && items[i].ID == *st.QueueItemID {
			return &items[i]
		}
	}
	if st.QueueItemID != nil || st.TrackID == nil {
		return nil
	}
	for i := range items {
		if items[i].TrackID == *st.TrackID {
			return &items[i]
		}
	}
	return nil
}

func (s *Parties) queue(tx *gorm.DB, partyID uuid.UUID) ([]model.PartyQueueItem, error) {
	var items []model.PartyQueueItem
	err := tx.Where("party_id = ?", partyID).Order("position ASC").Order("created_at ASC").Order("id ASC").Find(&items).Error
	return items, err
}

func (s *Parties) normalizeQueue(tx *gorm.DB, partyID uuid.UUID) ([]model.PartyQueueItem, error) {
	if err := compactPositions(tx, "party_queue_items", "party_id", partyID, "position, created_at, id"); err != nil {
		return nil, err
	}
	return s.queue(tx, partyID)
}

func (s *Parties) assemble(tx *gorm.DB, p *model.Party) (dto.PartyState, error) {
	var members []model.PartyMember
	if err := tx.Preload("User").Where("party_id = ?", p.ID).Order("joined_at ASC").Order("id ASC").Find(&members).Error; err != nil {
		return dto.PartyState{}, err
	}
	var items []model.PartyQueueItem
	if err := tx.Preload("Track.Album.Artist").Preload("Track.Artist").Preload("AddedBy").
		Where("party_id = ?", p.ID).Order("position ASC").Order("created_at ASC").Order("id ASC").Find(&items).Error; err != nil {
		return dto.PartyState{}, err
	}
	st, err := s.playback(tx, p.ID)
	if err != nil {
		return dto.PartyState{}, err
	}
	pb := dto.PartyPlayback{Playing: st.Playing, AnchorPositionSec: st.AnchorPositionSec, AnchorEpochMs: st.AnchorEpochMs}
	if st.TrackID != nil {
		t, err := first[model.Track](tracksQuery(tx), "Track", *st.TrackID)
		if err != nil {
			return dto.PartyState{}, err
		}
		dt := dto.FromTrack(t)
		pb.Track = &dt
	}
	return dto.PartyState{
		ID: p.ID, Revision: p.Revision, InviteCode: p.InviteCode, Name: p.Name, QueuePolicy: p.QueuePolicy, HostUserID: p.HostUserID,
		Members: dto.Map(members, func(m *model.PartyMember) dto.PartyMember {
			return dto.PartyMember{UserID: m.UserID, Username: m.User.Username, Host: m.Host, DJ: m.DJ, Connected: m.Connected}
		}),
		Queue: dto.Map(items, func(i *model.PartyQueueItem) dto.PartyQueueItem {
			return dto.PartyQueueItem{ID: i.ID, Position: i.Position, Track: dto.FromTrack(i.Track), AddedByUserID: i.AddedByUserID, AddedByUsername: i.AddedBy.Username}
		}),
		Playback: pb,
	}, nil
}

func (s *Parties) stage(tx *gorm.DB, o *outbox, p *model.Party) (dto.PartyState, error) {
	if err := tx.Raw(`UPDATE parties SET revision = revision + 1 WHERE id = ? RETURNING revision`, p.ID).Scan(&p.Revision).Error; err != nil {
		return dto.PartyState{}, err
	}
	st, err := s.assemble(tx, p)
	if err != nil {
		return dto.PartyState{}, err
	}
	o.states[p.InviteCode] = st
	return st, nil
}

func (s *Parties) close(tx *gorm.DB, o *outbox, p *model.Party) error {
	if p.Status == model.PartyEnded {
		return nil
	}
	p.Status = model.PartyEnded
	if err := tx.Model(p).Select("status", "updated_at").Updates(p).Error; err != nil {
		return err
	}
	if err := tx.Where("party_id = ?", p.ID).Delete(&model.PartyQueueItem{}).Error; err != nil {
		return err
	}
	if err := tx.Where("party_id = ?", p.ID).Delete(&model.PartyMember{}).Error; err != nil {
		return err
	}
	o.ended = append(o.ended, p.InviteCode)
	return nil
}

func (s *Parties) disconnect(tx *gorm.DB, o *outbox, user *model.User) error {
	var memberships []model.PartyMember
	if err := tx.Where("user_id = ? AND connected = true", user.ID).Find(&memberships).Error; err != nil {
		return err
	}
	for _, m := range memberships {
		var p model.Party
		if err := tx.Clauses(lockForUpdate()).First(&p, "id = ?", m.PartyID).Error; err != nil {
			return err
		}
		if m.Host {
			if err := s.close(tx, o, &p); err != nil {
				return err
			}
			continue
		}
		if err := tx.Delete(&model.PartyMember{}, "id = ?", m.ID).Error; err != nil {
			return err
		}
		o.removed = append(o.removed, removal{p.InviteCode, m.UserID})
		if p.Status == model.PartyActive {
			if _, err := s.stage(tx, o, &p); err != nil {
				return err
			}
		}
	}
	return nil
}

type CreatePartyInput struct {
	Name        string            `json:"name" binding:"notblank,size=0_120"`
	QueuePolicy model.QueuePolicy `json:"queuePolicy" binding:"required,oneof=DJ_ONLY EVERYONE"`
}

func (s *Parties) Create(ctx context.Context, user *model.User, in CreatePartyInput) (dto.PartyState, error) {
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return dto.PartyState{}, apperr.BadRequest("Party name is required")
	}
	var out dto.PartyState
	err := s.inTx(ctx, func(tx *gorm.DB, o *outbox) error {
		if err := s.disconnect(tx, o, user); err != nil {
			return err
		}
		code, err := s.uniqueCode(tx)
		if err != nil {
			return err
		}
		p := model.Party{InviteCode: code, Name: name, HostUserID: user.ID, QueuePolicy: in.QueuePolicy, Status: model.PartyActive}
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
		if err := tx.Omit("User").Create(&model.PartyMember{PartyID: p.ID, UserID: user.ID, Host: true, DJ: true, Connected: true}).Error; err != nil {
			return err
		}
		if err := tx.Omit("Track").Create(&model.PartyPlaybackState{PartyID: p.ID, AnchorEpochMs: s.nowMs()}).Error; err != nil {
			return err
		}
		out, err = s.stage(tx, o, &p)
		return err
	})
	return out, err
}

func (s *Parties) uniqueCode(tx *gorm.DB) (string, error) {
	for range 20 {
		code, err := generateInviteCode()
		if err != nil {
			return "", err
		}
		var n int64
		if err := tx.Model(&model.Party{}).Where("invite_code = ?", code).Count(&n).Error; err != nil {
			return "", err
		}
		if n == 0 {
			return code, nil
		}
	}
	return "", apperr.Conflict("Failed to generate invite code")
}

func (s *Parties) Join(ctx context.Context, user *model.User, code string) (dto.PartyState, error) {
	var out dto.PartyState
	err := s.inTx(ctx, func(tx *gorm.DB, o *outbox) error {
		if err := s.disconnect(tx, o, user); err != nil {
			return err
		}
		p, err := s.activeParty(tx, code, true)
		if err != nil {
			return err
		}
		m, err := s.member(tx, p.ID, user.ID)
		if err != nil {
			return err
		}
		if m != nil {
			err = tx.Model(m).Update("connected", true).Error
		} else {
			err = tx.Omit("User").Create(&model.PartyMember{PartyID: p.ID, UserID: user.ID, Connected: true}).Error
		}
		if err != nil {
			return err
		}
		out, err = s.stage(tx, o, p)
		return err
	})
	return out, err
}

func (s *Parties) Mine(ctx context.Context, user *model.User) (dto.PartyState, error) {
	tx := s.db.WithContext(ctx)
	var m model.PartyMember
	err := tx.Joins("JOIN parties ON parties.id = party_members.party_id AND parties.status = ?", model.PartyActive).
		Where("party_members.user_id = ? AND party_members.connected = true", user.ID).
		Order("party_members.joined_at DESC").First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return dto.PartyState{}, apperr.NotFound("No active party")
	}
	if err != nil {
		return dto.PartyState{}, err
	}
	var p model.Party
	if err := tx.First(&p, "id = ?", m.PartyID).Error; err != nil {
		return dto.PartyState{}, err
	}
	return s.assemble(tx, &p)
}

func (s *Parties) State(ctx context.Context, user *model.User, code string) (dto.PartyState, error) {
	tx := s.db.WithContext(ctx)
	p, err := s.activeParty(tx, code, false)
	if err != nil {
		return dto.PartyState{}, err
	}
	if _, err := s.requireMember(tx, p, user); err != nil {
		return dto.PartyState{}, err
	}
	return s.assemble(tx, p)
}

func (s *Parties) Leave(ctx context.Context, user *model.User, code string) error {
	return s.inTx(ctx, func(tx *gorm.DB, o *outbox) error {
		p, err := s.activeParty(tx, code, true)
		if err != nil {
			return err
		}
		m, err := s.requireMember(tx, p, user)
		if err != nil {
			return err
		}
		if m.Host {
			return s.close(tx, o, p)
		}
		if err := tx.Delete(&model.PartyMember{}, "id = ?", m.ID).Error; err != nil {
			return err
		}
		o.removed = append(o.removed, removal{p.InviteCode, m.UserID})
		_, err = s.stage(tx, o, p)
		return err
	})
}

func (s *Parties) End(ctx context.Context, user *model.User, code string) error {
	return s.inTx(ctx, func(tx *gorm.DB, o *outbox) error {
		p, err := s.activeParty(tx, code, true)
		if err != nil {
			return err
		}
		if err := s.requireHost(tx, p, user); err != nil {
			return err
		}
		return s.close(tx, o, p)
	})
}

type partyCheck func(tx *gorm.DB, p *model.Party, user *model.User) error

func (s *Parties) mutate(ctx context.Context, user *model.User, code string, check partyCheck, fn func(tx *gorm.DB, p *model.Party) error) (dto.PartyState, error) {
	var out dto.PartyState
	err := s.inTx(ctx, func(tx *gorm.DB, o *outbox) error {
		p, err := s.activeParty(tx, code, true)
		if err != nil {
			return err
		}
		if err := check(tx, p, user); err != nil {
			return err
		}
		if err := fn(tx, p); err != nil {
			return err
		}
		out, err = s.stage(tx, o, p)
		return err
	})
	return out, err
}

func (s *Parties) targetMember(tx *gorm.DB, p *model.Party, userID uuid.UUID) (*model.PartyMember, error) {
	m, err := s.member(tx, p.ID, userID)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, apperr.NotFound("Party member not found")
	}
	return m, nil
}

func (s *Parties) SetDJ(ctx context.Context, user *model.User, code string, target uuid.UUID, dj bool) (dto.PartyState, error) {
	return s.mutate(ctx, user, code, s.requireHost, func(tx *gorm.DB, p *model.Party) error {
		m, err := s.targetMember(tx, p, target)
		if err != nil {
			return err
		}
		if m.Host {
			return apperr.BadRequest("Host is always DJ")
		}
		return tx.Model(m).Update("dj", dj).Error
	})
}

func (s *Parties) Kick(ctx context.Context, user *model.User, code string, target uuid.UUID) (dto.PartyState, error) {
	var out dto.PartyState
	err := s.inTx(ctx, func(tx *gorm.DB, o *outbox) error {
		p, err := s.activeParty(tx, code, true)
		if err != nil {
			return err
		}
		if err := s.requireHost(tx, p, user); err != nil {
			return err
		}
		m, err := s.targetMember(tx, p, target)
		if err != nil {
			return err
		}
		if m.Host {
			return apperr.BadRequest("Cannot kick host")
		}
		if err := tx.Delete(&model.PartyMember{}, "id = ?", m.ID).Error; err != nil {
			return err
		}
		o.removed = append(o.removed, removal{p.InviteCode, m.UserID})
		out, err = s.stage(tx, o, p)
		return err
	})
	return out, err
}

func (s *Parties) AddTracks(ctx context.Context, user *model.User, code string, trackIDs []uuid.UUID) (dto.PartyState, error) {
	if len(trackIDs) == 0 {
		return dto.PartyState{}, apperr.BadRequest("At least one track is required")
	}
	return s.mutate(ctx, user, code, s.requireControl, func(tx *gorm.DB, p *model.Party) error {
		items, err := s.queue(tx, p.ID)
		if err != nil {
			return err
		}
		if err := requireTracks(tx, trackIDs); err != nil {
			return err
		}
		added := make([]model.PartyQueueItem, len(trackIDs))
		for i, id := range trackIDs {
			added[i] = model.PartyQueueItem{PartyID: p.ID, TrackID: id, AddedByUserID: user.ID, Position: len(items) + i}
		}
		if err := tx.Omit("Track", "AddedBy").Create(&added).Error; err != nil {
			return err
		}
		if len(items) > 0 {
			return nil
		}
		st, err := s.playback(tx, p.ID)
		if err != nil {
			return err
		}
		return s.savePlayback(tx, st, &added[0].ID, &added[0].TrackID, true, 0)
	})
}

func (s *Parties) RemoveItem(ctx context.Context, user *model.User, code string, itemID uuid.UUID) (dto.PartyState, error) {
	return s.mutate(ctx, user, code, s.requireControl, func(tx *gorm.DB, p *model.Party) error {
		var target model.PartyQueueItem
		err := tx.Where("id = ? AND party_id = ?", itemID, p.ID).First(&target).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.NotFound("Queue item not found")
		}
		if err != nil {
			return err
		}
		st, err := s.playback(tx, p.ID)
		if err != nil {
			return err
		}
		before, err := s.queue(tx, p.ID)
		if err != nil {
			return err
		}
		current := playingItem(st, before)
		if err := tx.Delete(&model.PartyQueueItem{}, "id = ?", target.ID).Error; err != nil {
			return err
		}
		items, err := s.normalizeQueue(tx, p.ID)
		if err != nil || current == nil || current.ID != target.ID {
			return err
		}
		return s.playHead(tx, st, items)
	})
}

func (s *Parties) playHead(tx *gorm.DB, st *model.PartyPlaybackState, items []model.PartyQueueItem) error {
	if len(items) == 0 {
		return s.savePlayback(tx, st, nil, nil, false, 0)
	}
	return s.savePlayback(tx, st, &items[0].ID, &items[0].TrackID, true, 0)
}

func (s *Parties) Reorder(ctx context.Context, user *model.User, code string, itemIDs []uuid.UUID) (dto.PartyState, error) {
	return s.mutate(ctx, user, code, s.requireControl, func(tx *gorm.DB, p *model.Party) error {
		items, err := s.queue(tx, p.ID)
		if err != nil {
			return err
		}
		if len(items) != len(itemIDs) {
			return apperr.BadRequest("Reorder list size mismatch")
		}
		known := make(map[uuid.UUID]bool, len(items))
		for _, it := range items {
			known[it.ID] = true
		}
		seen := make(map[uuid.UUID]bool, len(itemIDs))
		for _, id := range itemIDs {
			if !known[id] || seen[id] {
				return apperr.BadRequest("Invalid queue item in reorder")
			}
			seen[id] = true
		}
		return setPositions(tx, "party_queue_items", itemIDs)
	})
}

func (s *Parties) Play(ctx context.Context, user *model.User, code string, trackID uuid.UUID, pos float64) (dto.PartyState, error) {
	return s.mutate(ctx, user, code, s.requireControl, func(tx *gorm.DB, p *model.Party) error {
		if _, err := first[model.Track](tx.Select("id"), "Track", trackID); err != nil {
			return err
		}
		st, err := s.playback(tx, p.ID)
		if err != nil {
			return err
		}
		var item *uuid.UUID
		var match []uuid.UUID
		if err := tx.Model(&model.PartyQueueItem{}).Where("party_id = ? AND track_id = ?", p.ID, trackID).
			Order("position ASC").Order("created_at ASC").Order("id ASC").Limit(1).Pluck("id", &match).Error; err != nil {
			return err
		}
		if len(match) == 1 {
			item = &match[0]
		}
		return s.savePlayback(tx, st, item, &trackID, true, pos)
	})
}

func (s *Parties) Pause(ctx context.Context, user *model.User, code string, pos float64) (dto.PartyState, error) {
	return s.mutate(ctx, user, code, s.requireControl, func(tx *gorm.DB, p *model.Party) error {
		st, err := s.playback(tx, p.ID)
		if err != nil {
			return err
		}
		return s.savePlayback(tx, st, st.QueueItemID, st.TrackID, false, pos)
	})
}

func (s *Parties) Seek(ctx context.Context, user *model.User, code string, pos float64) (dto.PartyState, error) {
	return s.mutate(ctx, user, code, s.requireControl, func(tx *gorm.DB, p *model.Party) error {
		st, err := s.playback(tx, p.ID)
		if err != nil {
			return err
		}
		return s.savePlayback(tx, st, st.QueueItemID, st.TrackID, st.Playing, pos)
	})
}

func (s *Parties) Next(ctx context.Context, user *model.User, code string) (dto.PartyState, error) {
	return s.mutate(ctx, user, code, s.requireControl, func(tx *gorm.DB, p *model.Party) error {
		st, err := s.playback(tx, p.ID)
		if err != nil {
			return err
		}
		items, err := s.queue(tx, p.ID)
		if err != nil {
			return err
		}
		if current := playingItem(st, items); current != nil {
			if err := tx.Delete(&model.PartyQueueItem{}, "id = ?", current.ID).Error; err != nil {
				return err
			}
			if items, err = s.normalizeQueue(tx, p.ID); err != nil {
				return err
			}
		}
		return s.playHead(tx, st, items)
	})
}

func (s *Parties) Prev(ctx context.Context, user *model.User, code string) (dto.PartyState, error) {
	return s.mutate(ctx, user, code, s.requireControl, func(tx *gorm.DB, p *model.Party) error {
		st, err := s.playback(tx, p.ID)
		if err != nil || st.TrackID == nil {
			return err
		}
		return s.savePlayback(tx, st, st.QueueItemID, st.TrackID, true, 0)
	})
}

func (s *Parties) CloseIdle(ctx context.Context) (int, error) {
	var parties []model.Party
	if err := s.db.WithContext(ctx).Where("status = ?", model.PartyActive).Find(&parties).Error; err != nil {
		return 0, err
	}
	nowMs := s.nowMs()
	cutoff := nowMs - partyIdleWindow.Milliseconds()
	closed := 0
	for i := range parties {
		code := parties[i].InviteCode
		didClose := false
		err := s.inTx(ctx, func(tx *gorm.DB, o *outbox) error {
			p, err := s.activeParty(tx, code, true)
			if err != nil {
				return err
			}
			var st model.PartyPlaybackState
			err = tx.Where("party_id = ?", p.ID).First(&st).Error
			switch {
			case errors.Is(err, gorm.ErrRecordNotFound):
			case err != nil:
				return err
			case st.Playing:
				end, err := s.playbackEndMs(tx, &st)
				if err != nil || end > cutoff {
					return err
				}
			case st.AnchorEpochMs > cutoff:
				return nil
			}
			didClose = true
			return s.close(tx, o, p)
		})
		if err == nil && didClose {
			closed++
		}
		if err != nil && !isNotFound(err) {
			slog.Warn("idle party cleanup failed", "code", code, "err", err)
		}
	}
	return closed, nil
}

func (s *Parties) playbackEndMs(tx *gorm.DB, st *model.PartyPlaybackState) (int64, error) {
	remaining := unknownDurationCap.Seconds()
	if st.TrackID != nil {
		var duration int
		if err := tx.Model(&model.Track{}).Where("id = ?", *st.TrackID).Pluck("duration_seconds", &duration).Error; err != nil {
			return 0, err
		}
		if duration > 0 {
			remaining = max(float64(duration)-st.AnchorPositionSec, 0)
		}
	}
	return st.AnchorEpochMs + int64(remaining*1000), nil
}

func (s *Parties) RunCleanup(ctx context.Context, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if n, err := s.CloseIdle(ctx); err != nil {
				slog.Warn("idle party cleanup", "err", err)
			} else if n > 0 {
				slog.Info("closed idle parties", "count", n)
			}
		}
	}
}

func isNotFound(err error) bool {
	var ae *apperr.Error
	return errors.As(err, &ae) && ae.Status == 404
}
