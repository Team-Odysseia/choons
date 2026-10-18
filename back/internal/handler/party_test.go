package handler

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Team-Odysseia/choons/back/internal/model"
)

func TestPartyEndpoints(t *testing.T) {
	s := newServer(t)
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)
	host := s.login("host", model.RoleListener)
	guest := s.login("guest", model.RoleListener)

	host.json(http.MethodPost, "/parties", map[string]string{"name": "x"}).errorIs(400, "queuePolicy must not be null")
	host.json(http.MethodPost, "/parties", map[string]string{"name": "x", "queuePolicy": "ANYONE"}).errorIs(400, "queuePolicy must be one of [DJ_ONLY, EVERYONE]")
	st := host.json(http.MethodPost, "/parties", map[string]string{"name": "Friday", "queuePolicy": "DJ_ONLY"}).status(http.StatusCreated).keys()
	if sortedKeys(st) != "hostUserId,id,inviteCode,members,name,playback,queue,queuePolicy" {
		t.Fatalf("state keys %s", sortedKeys(st))
	}
	pb := st["playback"].(map[string]any)
	if sortedKeys(pb) != "anchorEpochMs,anchorPositionSec,playing,track" || pb["track"] != nil {
		t.Fatalf("playback %v", pb)
	}
	member := st["members"].([]any)[0].(map[string]any)
	if sortedKeys(member) != "connected,dj,host,userId,username" {
		t.Fatalf("member %v", member)
	}
	code := st["inviteCode"].(string)

	guest.json(http.MethodPost, "/parties/join", map[string]string{"inviteCode": "short"}).errorIs(400, "inviteCode size must be between 8 and 8")
	guest.json(http.MethodPost, "/parties/join", map[string]string{"inviteCode": strings.ToLower(code)}).status(200)
	guest.get("/parties/me").status(200)
	guest.json(http.MethodPost, "/parties/"+code+"/queue", map[string]string{"trackId": ids.track}).errorIs(403, "Only DJs can control queue in this party")

	st = host.json(http.MethodPost, "/parties/"+code+"/queue", map[string]string{"trackId": ids.track}).status(200).keys()
	queue := st["queue"].([]any)
	item := queue[0].(map[string]any)
	if sortedKeys(item) != "addedByUserId,addedByUsername,id,position,track" {
		t.Fatalf("queue item %v", item)
	}
	host.json(http.MethodPost, "/parties/"+code+"/queue/batch", map[string]any{"trackIds": []string{}}).errorIs(400, "trackIds must not be empty")
	host.json(http.MethodPost, "/parties/"+code+"/queue/batch", map[string]any{"trackIds": []string{ids.track}}).status(200)
	host.json(http.MethodPost, "/parties/"+code+"/playback/pause", map[string]float64{"positionSec": -1}).errorIs(400, "positionSec must be greater than or equal to 0")
	host.json(http.MethodPost, "/parties/"+code+"/playback/pause", map[string]float64{"positionSec": 12}).status(200)
	host.json(http.MethodPost, "/parties/"+code+"/playback/seek", map[string]float64{"positionSec": 30}).status(200)
	host.json(http.MethodPost, "/parties/"+code+"/playback/play", map[string]any{"positionSec": 1}).errorIs(400, "trackId must not be null")
	host.json(http.MethodPost, "/parties/"+code+"/playback/play", map[string]any{"trackId": ids.track, "positionSec": 1}).status(200)
	host.json(http.MethodPost, "/parties/"+code+"/playback/next", nil).status(200)
	host.json(http.MethodPost, "/parties/"+code+"/playback/prev", nil).status(200)
	st = host.get("/parties/" + code + "/state").status(200).keys()
	remaining := st["queue"].([]any)
	if len(remaining) != 1 {
		t.Fatalf("queue %v", remaining)
	}
	itemID := remaining[0].(map[string]any)["id"].(string)
	host.json(http.MethodPut, "/parties/"+code+"/queue/reorder", map[string]any{"orderedItemIds": []string{itemID}}).status(200)
	host.json(http.MethodDelete, "/parties/"+code+"/queue/"+itemID, nil).status(200)

	guestID := guest.user.ID.String()
	host.json(http.MethodPost, "/parties/"+code+"/members/"+guestID+"/dj", map[string]bool{"dj": true}).status(200)
	guest.json(http.MethodPost, "/parties/"+code+"/queue", map[string]string{"trackId": ids.track}).status(200)
	host.json(http.MethodPost, "/parties/"+code+"/members/"+host.user.ID.String()+"/kick", nil).errorIs(400, "Cannot kick host")
	host.json(http.MethodPost, "/parties/"+code+"/members/"+guestID+"/kick", nil).status(200)
	guest.get("/parties/"+code+"/state").errorIs(403, "User is not in party")
	guest.get("/parties/me").errorIs(404, "No active party")

	host.json(http.MethodPost, "/parties/"+code+"/end", nil).status(204)
	host.get("/parties/"+code+"/state").errorIs(404, "Party not found")
}

type sseEvent struct {
	name string
	data string
}

func readEvents(t *testing.T, sc *bufio.Scanner, out chan<- sseEvent) {
	var ev sseEvent
	for sc.Scan() {
		line := sc.Text()
		switch {
		case strings.HasPrefix(line, "event:"):
			ev.name = strings.TrimPrefix(line, "event:")
		case strings.HasPrefix(line, "data:"):
			ev.data = strings.TrimPrefix(line, "data:")
		case line == "":
			out <- ev
			ev = sseEvent{}
		}
	}
	close(out)
}

func next(t *testing.T, ch <-chan sseEvent) (sseEvent, bool) {
	t.Helper()
	select {
	case ev, ok := <-ch:
		return ev, ok
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for SSE event")
		return sseEvent{}, false
	}
}

func TestPartySSE(t *testing.T) {
	s := newServer(t, opts{loginPerMin: 1000, streamPerMin: 1000, heartbeat: 150 * time.Millisecond, sseTimeout: time.Minute})
	admin := s.login("root", model.RoleAdmin)
	ids := s.seedCatalog(admin)
	host := s.login("host", model.RoleListener)
	outsider := s.login("outsider", model.RoleListener)
	st := host.json(http.MethodPost, "/parties", map[string]string{"name": "Live", "queuePolicy": "EVERYONE"}).status(http.StatusCreated).keys()
	code := st["inviteCode"].(string)

	srv := httptest.NewServer(s.router)
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	open := func(sess *session) *http.Response {
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL+"/parties/"+strings.ToLower(code)+"/events", nil)
		req.AddCookie(sess.cookie)
		req.Header.Set("Origin", testOrigin)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		return resp
	}

	denied := open(outsider)
	denied.Body.Close()
	if denied.StatusCode != http.StatusForbidden {
		t.Fatalf("outsider SSE %d", denied.StatusCode)
	}
	if n := s.h.Hub.Count(code); n != 0 {
		t.Fatalf("denied subscriber leaked: %d", n)
	}

	resp := open(host)
	defer resp.Body.Close()
	if resp.StatusCode != 200 || resp.Header.Get("Content-Type") != "text/event-stream" ||
		resp.Header.Get("X-Accel-Buffering") != "no" || resp.Header.Get("Access-Control-Allow-Origin") != testOrigin {
		t.Fatalf("sse response %d %v", resp.StatusCode, resp.Header)
	}
	events := make(chan sseEvent, 32)
	go readEvents(t, bufio.NewScanner(resp.Body), events)

	ev, _ := next(t, events)
	var initial map[string]any
	if ev.name != "state" || json.Unmarshal([]byte(ev.data), &initial) != nil || initial["inviteCode"] != code {
		t.Fatalf("initial event %+v", ev)
	}

	host.json(http.MethodPost, "/parties/"+code+"/queue", map[string]string{"trackId": ids.track}).status(200)
	sawState, sawHeartbeat := false, false
	for !sawState || !sawHeartbeat {
		ev, ok := next(t, events)
		if !ok {
			t.Fatal("stream closed early")
		}
		switch ev.name {
		case "state":
			var st map[string]any
			if err := json.Unmarshal([]byte(ev.data), &st); err != nil {
				t.Fatal(err)
			}
			if len(st["queue"].([]any)) == 1 && st["playback"].(map[string]any)["playing"] == true {
				sawState = true
			}
		case "heartbeat":
			if ev.data != "ok" {
				t.Fatalf("heartbeat data %q", ev.data)
			}
			sawHeartbeat = true
		}
	}

	host.json(http.MethodPost, "/parties/"+code+"/end", nil).status(204)
	for {
		ev, ok := next(t, events)
		if !ok {
			t.Fatal("stream closed without ended event")
		}
		if ev.name == "ended" {
			if ev.data != "{}" {
				t.Fatalf("ended data %q", ev.data)
			}
			break
		}
	}
	if _, ok := next(t, events); ok {
		t.Fatal("stream should close after ended")
	}
	deadline := time.Now().Add(2 * time.Second)
	for s.h.Hub.Count(code) != 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if n := s.h.Hub.Count(code); n != 0 {
		t.Fatalf("subscribers left after end: %d", n)
	}
}

func TestPartySSETimeout(t *testing.T) {
	s := newServer(t, opts{loginPerMin: 1000, streamPerMin: 1000, heartbeat: time.Hour, sseTimeout: 200 * time.Millisecond})
	host := s.login("host", model.RoleListener)
	code := host.json(http.MethodPost, "/parties", map[string]string{"name": "T", "queuePolicy": "EVERYONE"}).status(201).keys()["inviteCode"].(string)
	srv := httptest.NewServer(s.router)
	defer srv.Close()
	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/parties/"+code+"/events", nil)
	req.AddCookie(host.cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	events := make(chan sseEvent, 4)
	go readEvents(t, bufio.NewScanner(resp.Body), events)
	if ev, _ := next(t, events); ev.name != "state" {
		t.Fatalf("%+v", ev)
	}
	if _, ok := next(t, events); ok {
		t.Fatal("expected stream to close at timeout")
	}
}
