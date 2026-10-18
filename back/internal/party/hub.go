package party

import (
	"encoding/json"
	"log/slog"
	"strings"
	"sync"

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
	closed bool
}

type Hub struct {
	mu   sync.Mutex
	subs map[string]map[*Subscriber]struct{}
}

func NewHub() *Hub {
	return &Hub{subs: map[string]map[*Subscriber]struct{}{}}
}

func normalize(code string) string { return strings.ToUpper(code) }

func (h *Hub) Subscribe(code string) *Subscriber {
	code = normalize(code)
	s := &Subscriber{C: make(chan Event, subscriberBuffer), code: code}
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

func (h *Hub) broadcast(code string, ev Event) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for s := range h.subs[normalize(code)] {
		select {
		case s.C <- ev:
		default:
			slog.Warn("dropping slow party subscriber", "code", s.code)
			h.removeLocked(s)
		}
	}
}

func (h *Hub) PublishState(code string, state dto.PartyState) {
	data, err := json.Marshal(state)
	if err != nil {
		slog.Error("marshal party state", "err", err)
		return
	}
	h.broadcast(code, Event{Name: "state", Data: data})
}

func (h *Hub) PublishEnded(code string) {
	h.broadcast(code, Event{Name: "ended", Data: []byte("{}")})
	h.mu.Lock()
	defer h.mu.Unlock()
	for s := range h.subs[normalize(code)] {
		h.removeLocked(s)
	}
}

func (h *Hub) Count(code string) int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subs[normalize(code)])
}
