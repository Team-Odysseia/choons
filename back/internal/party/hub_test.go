package party

import (
	"encoding/json"
	"testing"

	"github.com/Team-Odysseia/choons/back/internal/dto"
)

func TestPublishStateReachesSubscribersOfSameCodeOnly(t *testing.T) {
	h := NewHub()
	a := h.Subscribe("abcdefgh")
	b := h.Subscribe("ABCDEFGH")
	other := h.Subscribe("ZZZZZZZZ")
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
	s := h.Subscribe("CODE0001")
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
	slow := h.Subscribe("CODE0002")
	for range subscriberBuffer + 1 {
		h.PublishState("CODE0002", dto.PartyState{})
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
	s := h.Subscribe("CODE0003")
	h.Unsubscribe(s)
	h.Unsubscribe(s)
	h.PublishState("CODE0003", dto.PartyState{})
	if _, ok := <-s.C; ok {
		t.Fatal("unsubscribed channel received event")
	}
}
