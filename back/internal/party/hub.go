package party

import (
	"encoding/json"
	"log/slog"
	"strings"
	"sync"

	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/dto"
)

const subscriberBuffer = 16

type Event struct {
	Name string
	Data []byte
}

type Subscriber struct {
	C      chan Event
	code   string
	user   uuid.UUID
	closed bool
}

type Hub struct {
	mu       sync.Mutex
	subs     map[string]map[*Subscriber]struct{}
	revision map[string]int64
}

func NewHub() *Hub {
	return &Hub{subs: map[string]map[*Subscriber]struct{}{}, revision: map[string]int64{}}
}

func normalize(code string) string { return strings.ToUpper(code) }

func (h *Hub) Subscribe(code string, user uuid.UUID) *Subscriber {
	code = normalize(code)
	s := &Subscriber{C: make(chan Event, subscriberBuffer), code: code, user: user}
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs[code] == nil {
		h.subs[code] = map[*Subscriber]struct{}{}
	}
	h.subs[code][s] = struct{}{}
	return s
}

func (h *Hub) Unsubscribe(s *Subscriber) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.removeLocked(s)
}

func (h *Hub) removeLocked(s *Subscriber) {
	set := h.subs[s.code]
	if _, ok := set[s]; !ok {
		return
	}
	delete(set, s)
	if len(set) == 0 {
		delete(h.subs, s.code)
	}
	if !s.closed {
		s.closed = true
		close(s.C)
	}
}

var endedEvent = Event{Name: "ended", Data: []byte("{}")}

func (h *Hub) broadcastLocked(code string, ev Event) {
	for s := range h.subs[code] {
		h.sendLocked(s, ev)
	}
}

func (h *Hub) sendLocked(s *Subscriber, ev Event) {
	select {
	case s.C <- ev:
	default:
		slog.Warn("dropping slow party subscriber", "code", s.code)
		h.removeLocked(s)
	}
}

func (h *Hub) PublishState(code string, state dto.PartyState) {
	data, err := json.Marshal(state)
	if err != nil {
		slog.Error("marshal party state", "err", err)
		return
	}
	code = normalize(code)
	h.mu.Lock()
	defer h.mu.Unlock()
	if last, ok := h.revision[code]; ok && state.Revision <= last {
		return
	}
	h.revision[code] = state.Revision
	h.broadcastLocked(code, Event{Name: "state", Data: data})
}

func (h *Hub) PublishEnded(code string) {
	code = normalize(code)
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.revision, code)
	h.broadcastLocked(code, endedEvent)
	for s := range h.subs[code] {
		h.removeLocked(s)
	}
}

func (h *Hub) PublishRemoved(code string, user uuid.UUID) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for s := range h.subs[normalize(code)] {
		if s.user != user {
			continue
		}
		h.sendLocked(s, endedEvent)
		h.removeLocked(s)
	}
}

func (h *Hub) Count(code string) int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subs[normalize(code)])
}
