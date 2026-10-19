package party

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/dto"
)

func TestPublishStateReachesSubscribersOfSameCodeOnly(t *testing.T) {
	h := NewHub()
	a := h.Subscribe("abcdefgh", uuid.New())
	b := h.Subscribe("ABCDEFGH", uuid.New())
	other := h.Subscribe("ZZZZZZZZ", uuid.New())
	h.PublishState("AbCdEfGh", dto.PartyState{Name: "x", InviteCode: "ABCDEFGH"})
	for _, s := range []*Subscriber{a, b} {
		ev := <-s.C
		var st dto.PartyState
		if ev.Name != "state" || json.Unmarshal(ev.Data, &st) != nil || st.Name != "x" {
			t.Fatalf("%+v", ev)
		}
	}
	select {
	case ev := <-other.C:
		t.Fatalf("leaked event %+v", ev)
	default:
	}
	if h.Count("abcdefgh") != 2 {
		t.Fatal(h.Count("abcdefgh"))
	}
}

func TestPublishEndedClosesSubscribers(t *testing.T) {
	h := NewHub()
	s := h.Subscribe("CODE0001", uuid.New())
	h.PublishEnded("code0001")
	ev, ok := <-s.C
	if !ok || ev.Name != "ended" || string(ev.Data) != "{}" {
		t.Fatalf("%+v %v", ev, ok)
	}
	if _, ok := <-s.C; ok {
		t.Fatal("channel should be closed")
	}
	if h.Count("CODE0001") != 0 {
		t.Fatal("subscriber not removed")
	}
	h.Unsubscribe(s)
}

func TestSlowSubscriberIsDropped(t *testing.T) {
	h := NewHub()
	slow := h.Subscribe("CODE0002", uuid.New())
	for i := range subscriberBuffer + 1 {
		h.PublishState("CODE0002", dto.PartyState{Revision: int64(i + 1)})
	}
	if h.Count("CODE0002") != 0 {
		t.Fatal("slow subscriber kept")
	}
	n := 0
	for range slow.C {
		n++
	}
	if n != subscriberBuffer {
		t.Fatalf("drained %d buffered events", n)
	}
}

func TestUnsubscribeIsIdempotent(t *testing.T) {
	h := NewHub()
	s := h.Subscribe("CODE0003", uuid.New())
	h.Unsubscribe(s)
	h.Unsubscribe(s)
	h.PublishState("CODE0003", dto.PartyState{})
	if _, ok := <-s.C; ok {
		t.Fatal("unsubscribed channel received event")
	}
}

func TestPublishRemovedEndsOnlyThatUsersStreams(t *testing.T) {
	h := NewHub()
	kicked, stays := uuid.New(), uuid.New()
	tab1 := h.Subscribe("CODE0004", kicked)
	tab2 := h.Subscribe("code0004", kicked)
	other := h.Subscribe("CODE0004", stays)
	elsewhere := h.Subscribe("CODE0005", kicked)

	h.PublishRemoved("code0004", kicked)
	for _, s := range []*Subscriber{tab1, tab2} {
		if ev, ok := <-s.C; !ok || ev.Name != "ended" {
			t.Fatalf("%+v %v", ev, ok)
		}
		if _, ok := <-s.C; ok {
			t.Fatal("removed user's channel should be closed")
		}
	}
	h.PublishState("CODE0004", dto.PartyState{})
	h.PublishState("CODE0005", dto.PartyState{})
	if ev := <-other.C; ev.Name != "state" {
		t.Fatalf("%+v", ev)
	}
	if ev := <-elsewhere.C; ev.Name != "state" {
		t.Fatalf("other party stream must survive: %+v", ev)
	}
	if h.Count("CODE0004") != 1 {
		t.Fatal(h.Count("CODE0004"))
	}
}

func TestStaleStateIsDropped(t *testing.T) {
	h := NewHub()
	s := h.Subscribe("CODE0006", uuid.New())
	h.PublishState("CODE0006", dto.PartyState{Revision: 2})
	h.PublishState("code0006", dto.PartyState{Revision: 1})
	h.PublishState("CODE0006", dto.PartyState{Revision: 2})
	h.PublishState("CODE0006", dto.PartyState{Revision: 3})
	var got []int64
	for range 2 {
		var st dto.PartyState
		if err := json.Unmarshal((<-s.C).Data, &st); err != nil {
			t.Fatal(err)
		}
		got = append(got, st.Revision)
	}
	select {
	case ev := <-s.C:
		t.Fatalf("stale event delivered: %s", ev.Data)
	default:
	}
	if got[0] != 2 || got[1] != 3 {
		t.Fatalf("revisions %v", got)
	}

	h.PublishEnded("CODE0006")
	again := h.Subscribe("CODE0006", uuid.New())
	h.PublishState("CODE0006", dto.PartyState{Revision: 1})
	if ev := <-again.C; ev.Name != "state" {
		t.Fatalf("revision tracking must reset after ended: %+v", ev)
	}
}
