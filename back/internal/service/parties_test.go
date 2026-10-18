package service

import (
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Team-Odysseia/choons/back/internal/dto"
	"github.com/Team-Odysseia/choons/back/internal/model"
)

type recordedEvent struct {
	name  string
	code  string
	state dto.PartyState
	user  uuid.UUID
}

type fakePublisher struct {
	mu     sync.Mutex
	events []recordedEvent
}

func (f *fakePublisher) PublishState(code string, st dto.PartyState) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.events = append(f.events, recordedEvent{name: "state", code: code, state: st})
}

func (f *fakePublisher) PublishEnded(code string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.events = append(f.events, recordedEvent{name: "ended", code: code})
}

func (f *fakePublisher) PublishRemoved(code string, user uuid.UUID) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.events = append(f.events, recordedEvent{name: "removed", code: code, user: user})
}

func (f *fakePublisher) take() []recordedEvent {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := f.events
	f.events = nil
	return out
}

type partyEnv struct {
	*env
	parties *Parties
	pub     *fakePublisher
	clock   time.Time
	host    *model.User
	guest   *model.User
	tracks  []*model.Track
}

func newPartyEnv(t *testing.T) *partyEnv {
	t.Helper()
	e := newEnv(t)
	pub := &fakePublisher{}
	pe := &partyEnv{env: e, pub: pub, clock: time.UnixMilli(1_700_000_000_000)}
	pe.parties = NewParties(e.db, pub)
	pe.parties.now = func() time.Time { return pe.clock }
	pe.host = e.user(t, "host", model.RoleListener)
	pe.guest = e.user(t, "guest", model.RoleListener)
	album := e.album(t, e.artist(t, "A"), "x", 1)
	for i := range 3 {
		pe.tracks = append(pe.tracks, e.track(t, album, string(rune('a'+i)), i+1))
	}
	return pe
}

func (pe *partyEnv) create(t *testing.T, policy model.QueuePolicy) dto.PartyState {
	t.Helper()
	st, err := pe.parties.Create(pe.ctx, pe.host, CreatePartyInput{Name: "  Friday  ", QueuePolicy: policy})
	if err != nil {
		t.Fatal(err)
	}
	return st
}

func queueTracks(st dto.PartyState) []uuid.UUID {
	return ids(st.Queue, func(q dto.PartyQueueItem) uuid.UUID { return q.Track.ID })
}

func TestCreateJoinAndState(t *testing.T) {
	pe := newPartyEnv(t)
	st := pe.create(t, model.PolicyDJOnly)
	if st.Name != "Friday" || len(st.InviteCode) != 8 || st.HostUserID != pe.host.ID || st.QueuePolicy != model.PolicyDJOnly {
		t.Fatalf("%+v", st)
	}
	for _, r := range st.InviteCode {
		if !strings.ContainsRune(inviteAlphabet, r) {
			t.Fatalf("invite code %q uses char outside alphabet", st.InviteCode)
		}
	}
	if len(st.Members) != 1 || !st.Members[0].Host || !st.Members[0].DJ || !st.Members[0].Connected {
		t.Fatalf("host member %+v", st.Members)
	}
	if st.Playback.Track != nil || st.Playback.Playing || st.Queue == nil || st.Playback.AnchorEpochMs != pe.clock.UnixMilli() {
		t.Fatalf("initial playback %+v", st.Playback)
	}
	if ev := pe.pub.take(); len(ev) != 1 || ev[0].name != "state" || ev[0].code != st.InviteCode {
		t.Fatalf("events %+v", ev)
	}

	_, err := pe.parties.State(pe.ctx, pe.guest, st.InviteCode)
	wantAppErr(t, err, 403, "User is not in party")
	_, err = pe.parties.Join(pe.ctx, pe.guest, "ZZZZZZZZ")
	wantAppErr(t, err, 404, "Party not found")

	joined, err := pe.parties.Join(pe.ctx, pe.guest, " "+strings.ToLower(st.InviteCode)+" ")
	if err != nil {
		t.Fatal(err)
	}
	if len(joined.Members) != 2 || joined.Members[1].Username != "guest" || joined.Members[1].DJ || joined.Members[1].Host {
		t.Fatalf("%+v", joined.Members)
	}
	if _, err := pe.parties.State(pe.ctx, pe.guest, strings.ToLower(st.InviteCode)); err != nil {
		t.Fatalf("lowercase code lookup: %v", err)
	}
	mine, err := pe.parties.Mine(pe.ctx, pe.guest)
	if err != nil || mine.ID != st.ID {
		t.Fatalf("%v", err)
	}
	if again, _ := pe.parties.Join(pe.ctx, pe.guest, st.InviteCode); len(again.Members) != 2 {
		t.Fatalf("rejoin duplicates member: %+v", again.Members)
	}
	_, err = pe.parties.Mine(pe.ctx, e2user(t, pe))
	wantAppErr(t, err, 404, "No active party")
}

func e2user(t *testing.T, pe *partyEnv) *model.User {
	return pe.user(t, "loner", model.RoleListener)
}

func TestCreateValidatesName(t *testing.T) {
	pe := newPartyEnv(t)
	_, err := pe.parties.Create(pe.ctx, pe.host, CreatePartyInput{Name: "   ", QueuePolicy: model.PolicyEveryone})
	wantAppErr(t, err, 400, "Party name is required")
}

func TestCreatingNewPartyClosesHostedOneAndJoiningMovesGuest(t *testing.T) {
	pe := newPartyEnv(t)
	first := pe.create(t, model.PolicyEveryone)
	pe.parties.Join(pe.ctx, pe.guest, first.InviteCode)
	pe.pub.take()

	second := pe.create(t, model.PolicyEveryone)
	ev := pe.pub.take()
	if len(ev) != 2 || ev[0].name != "ended" || ev[0].code != first.InviteCode || ev[1].code != second.InviteCode {
		t.Fatalf("events %+v", ev)
	}
	_, err := pe.parties.State(pe.ctx, pe.host, first.InviteCode)
	wantAppErr(t, err, 404, "Party not found")
	_, err = pe.parties.Mine(pe.ctx, pe.guest)
	wantAppErr(t, err, 404, "No active party")

	third, _ := pe.parties.Create(pe.ctx, pe.guest, CreatePartyInput{Name: "g", QueuePolicy: model.PolicyEveryone})
	pe.parties.Join(pe.ctx, pe.host, third.InviteCode)
	if _, err := pe.parties.State(pe.ctx, pe.host, second.InviteCode); err == nil {
		t.Fatal("host joining another party must close the hosted one")
	}

	guest2 := pe.user(t, "g2", model.RoleListener)
	pe.parties.Join(pe.ctx, guest2, third.InviteCode)
	fourth, _ := pe.parties.Create(pe.ctx, pe.user(t, "h4", model.RoleListener), CreatePartyInput{Name: "4", QueuePolicy: model.PolicyEveryone})
	pe.pub.take()
	pe.parties.Join(pe.ctx, guest2, fourth.InviteCode)
	ev = pe.pub.take()
	codes := []string{}
	for _, e := range ev {
		codes = append(codes, e.name+":"+e.code)
	}
	if !slices.Contains(codes, "state:"+third.InviteCode) || !slices.Contains(codes, "state:"+fourth.InviteCode) {
		t.Fatalf("moving guest must publish both parties: %v", codes)
	}
	st, _ := pe.parties.State(pe.ctx, pe.guest, third.InviteCode)
	if len(st.Members) != 2 {
		t.Fatalf("guest2 should have left third: %+v", st.Members)
	}
}

func TestAccessRules(t *testing.T) {
	pe := newPartyEnv(t)
	st := pe.create(t, model.PolicyDJOnly)
	code := st.InviteCode
	pe.parties.Join(pe.ctx, pe.guest, code)
	tr := pe.tracks[0].ID

	_, err := pe.parties.AddTracks(pe.ctx, pe.guest, code, []uuid.UUID{tr})
	wantAppErr(t, err, 403, "Only DJs can control queue in this party")
	_, err = pe.parties.SetDJ(pe.ctx, pe.guest, code, pe.guest.ID, true)
	wantAppErr(t, err, 403, "Only host can perform this action")
	wantAppErr(t, pe.parties.End(pe.ctx, pe.guest, code), 403, "Only host can perform this action")
	_, err = pe.parties.SetDJ(pe.ctx, pe.host, code, pe.host.ID, false)
	wantAppErr(t, err, 400, "Host is always DJ")
	_, err = pe.parties.Kick(pe.ctx, pe.host, code, pe.host.ID)
	wantAppErr(t, err, 400, "Cannot kick host")
	_, err = pe.parties.SetDJ(pe.ctx, pe.host, code, uuid.New(), true)
	wantAppErr(t, err, 404, "Party member not found")
	outsider := pe.user(t, "out", model.RoleListener)
	_, err = pe.parties.Pause(pe.ctx, outsider, code, 0)
	wantAppErr(t, err, 403, "User is not in party")

	st, err = pe.parties.SetDJ(pe.ctx, pe.host, code, pe.guest.ID, true)
	if err != nil || !st.Members[1].DJ {
		t.Fatalf("%+v %v", st.Members, err)
	}
	if _, err := pe.parties.AddTracks(pe.ctx, pe.guest, code, []uuid.UUID{tr}); err != nil {
		t.Fatalf("dj can control: %v", err)
	}
	st, err = pe.parties.Kick(pe.ctx, pe.host, code, pe.guest.ID)
	if err != nil || len(st.Members) != 1 {
		t.Fatalf("%+v %v", st.Members, err)
	}
	_, err = pe.parties.State(pe.ctx, pe.guest, code)
	wantAppErr(t, err, 403, "User is not in party")
}

func TestRemovedMembersLoseTheirStream(t *testing.T) {
	pe := newPartyEnv(t)
	code := pe.create(t, model.PolicyEveryone).InviteCode
	pe.parties.Join(pe.ctx, pe.guest, code)
	pe.pub.take()

	pe.parties.Kick(pe.ctx, pe.host, code, pe.guest.ID)
	ev := pe.pub.take()
	if len(ev) != 2 || ev[0].name != "removed" || ev[0].code != code || ev[0].user != pe.guest.ID || ev[1].name != "state" {
		t.Fatalf("kick: %+v", ev)
	}

	pe.parties.Join(pe.ctx, pe.guest, code)
	other, _ := pe.parties.Create(pe.ctx, pe.user(t, "h2", model.RoleListener), CreatePartyInput{Name: "o", QueuePolicy: model.PolicyEveryone})
	pe.pub.take()
	pe.parties.Join(pe.ctx, pe.guest, other.InviteCode)
	ev = pe.pub.take()
	if len(ev) == 0 || ev[0].name != "removed" || ev[0].code != code || ev[0].user != pe.guest.ID {
		t.Fatalf("joining elsewhere must remove stream from old party: %+v", ev)
	}
}

func TestStateRevisionIncreasesPerMutation(t *testing.T) {
	pe := newPartyEnv(t)
	created := pe.create(t, model.PolicyEveryone)
	joined, _ := pe.parties.Join(pe.ctx, pe.guest, created.InviteCode)
	queued, _ := pe.parties.AddTracks(pe.ctx, pe.host, created.InviteCode, []uuid.UUID{pe.tracks[0].ID})
	if created.Revision < 1 || joined.Revision <= created.Revision || queued.Revision <= joined.Revision {
		t.Fatalf("revisions %d %d %d", created.Revision, joined.Revision, queued.Revision)
	}
	if _, err := pe.parties.AddTracks(pe.ctx, pe.host, created.InviteCode, []uuid.UUID{uuid.New()}); err == nil {
		t.Fatal("expected error")
	}
	current, _ := pe.parties.State(pe.ctx, pe.host, created.InviteCode)
	if current.Revision != queued.Revision {
		t.Fatalf("failed mutation must not bump revision: %d vs %d", current.Revision, queued.Revision)
	}
}

func TestEveryonePolicyLetsGuestsControl(t *testing.T) {
	pe := newPartyEnv(t)
	st := pe.create(t, model.PolicyEveryone)
	pe.parties.Join(pe.ctx, pe.guest, st.InviteCode)
	if _, err := pe.parties.AddTracks(pe.ctx, pe.guest, st.InviteCode, []uuid.UUID{pe.tracks[0].ID}); err != nil {
		t.Fatal(err)
	}
}

func TestQueueAndPlayback(t *testing.T) {
	pe := newPartyEnv(t)
	code := pe.create(t, model.PolicyDJOnly).InviteCode
	a, b, c := pe.tracks[0].ID, pe.tracks[1].ID, pe.tracks[2].ID

	st, err := pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{a})
	if err != nil {
		t.Fatal(err)
	}
	if st.Playback.Track == nil || st.Playback.Track.ID != a || !st.Playback.Playing || st.Playback.AnchorPositionSec != 0 {
		t.Fatalf("first add auto-plays: %+v", st.Playback)
	}
	if st.Queue[0].AddedByUsername != "host" || st.Queue[0].Track.Album.Artist.Name != "A" {
		t.Fatalf("%+v", st.Queue[0])
	}
	pe.clock = pe.clock.Add(time.Second)
	st, _ = pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{b, c})
	if !slices.Equal(queueTracks(st), []uuid.UUID{a, b, c}) || st.Playback.Track.ID != a || st.Playback.AnchorEpochMs != pe.clock.Add(-time.Second).UnixMilli() {
		t.Fatalf("append must not change playback: %v %+v", queueTracks(st), st.Playback)
	}
	missing := uuid.New()
	_, err = pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{missing})
	wantAppErr(t, err, 404, "Track not found: "+missing.String())
	_, err = pe.parties.AddTracks(pe.ctx, pe.host, code, nil)
	wantAppErr(t, err, 400, "At least one track is required")

	st, _ = pe.parties.Pause(pe.ctx, pe.host, code, 42.5)
	if st.Playback.Playing || st.Playback.AnchorPositionSec != 42.5 || st.Playback.Track.ID != a || st.Playback.AnchorEpochMs != pe.clock.UnixMilli() {
		t.Fatalf("pause %+v", st.Playback)
	}
	st, _ = pe.parties.Seek(pe.ctx, pe.host, code, -5)
	if st.Playback.AnchorPositionSec != 0 || st.Playback.Playing {
		t.Fatalf("seek clamps and keeps paused: %+v", st.Playback)
	}
	st, _ = pe.parties.Play(pe.ctx, pe.host, code, c, 10)
	if st.Playback.Track.ID != c || !st.Playback.Playing || st.Playback.AnchorPositionSec != 10 {
		t.Fatalf("play %+v", st.Playback)
	}
	_, err = pe.parties.Play(pe.ctx, pe.host, code, missing, 0)
	wantAppErr(t, err, 404, "")

	st, _ = pe.parties.Next(pe.ctx, pe.host, code)
	if !slices.Equal(queueTracks(st), []uuid.UUID{a, b}) || st.Playback.Track.ID != a {
		t.Fatalf("next removes current (c) and plays head: %v %+v", queueTracks(st), st.Playback)
	}
	if st.Queue[0].Position != 0 || st.Queue[1].Position != 1 {
		t.Fatalf("positions not normalized %+v", st.Queue)
	}
	st, _ = pe.parties.Prev(pe.ctx, pe.host, code)
	if st.Playback.Track.ID != a || st.Playback.AnchorPositionSec != 0 || !st.Playback.Playing {
		t.Fatalf("prev restarts %+v", st.Playback)
	}

	st, err = pe.parties.Reorder(pe.ctx, pe.host, code, []uuid.UUID{st.Queue[1].ID, st.Queue[0].ID})
	if err != nil || !slices.Equal(queueTracks(st), []uuid.UUID{b, a}) {
		t.Fatalf("reorder %v %v", queueTracks(st), err)
	}
	_, err = pe.parties.Reorder(pe.ctx, pe.host, code, []uuid.UUID{st.Queue[0].ID})
	wantAppErr(t, err, 400, "Reorder list size mismatch")
	_, err = pe.parties.Reorder(pe.ctx, pe.host, code, []uuid.UUID{st.Queue[0].ID, uuid.New()})
	wantAppErr(t, err, 400, "Invalid queue item in reorder")
	_, err = pe.parties.Reorder(pe.ctx, pe.host, code, []uuid.UUID{st.Queue[0].ID, st.Queue[0].ID})
	wantAppErr(t, err, 400, "Invalid queue item in reorder")

	aItem := st.Queue[1].ID
	st, _ = pe.parties.RemoveItem(pe.ctx, pe.host, code, aItem)
	if !slices.Equal(queueTracks(st), []uuid.UUID{b}) || st.Playback.Track.ID != b || st.Playback.AnchorPositionSec != 0 {
		t.Fatalf("removing playing track advances to head: %v %+v", queueTracks(st), st.Playback)
	}
	_, err = pe.parties.RemoveItem(pe.ctx, pe.host, code, aItem)
	wantAppErr(t, err, 404, "Queue item not found")

	st, _ = pe.parties.Next(pe.ctx, pe.host, code)
	if len(st.Queue) != 0 || st.Playback.Track != nil || st.Playback.Playing {
		t.Fatalf("next on last stops: %+v", st)
	}
	st, _ = pe.parties.Prev(pe.ctx, pe.host, code)
	if st.Playback.Track != nil {
		t.Fatal("prev with nothing playing is no-op")
	}
	st, _ = pe.parties.Next(pe.ctx, pe.host, code)
	if st.Playback.Track != nil || st.Playback.Playing {
		t.Fatal("next on empty queue stops")
	}
}

func TestRemovingNonPlayingItemKeepsPlayback(t *testing.T) {
	pe := newPartyEnv(t)
	code := pe.create(t, model.PolicyDJOnly).InviteCode
	st, _ := pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{pe.tracks[0].ID, pe.tracks[1].ID})
	before := st.Playback
	pe.clock = pe.clock.Add(time.Minute)
	st, _ = pe.parties.RemoveItem(pe.ctx, pe.host, code, st.Queue[1].ID)
	if st.Playback.Track.ID != before.Track.ID || st.Playback.AnchorEpochMs != before.AnchorEpochMs || st.Playback.Playing != before.Playing {
		t.Fatalf("playback changed: %+v -> %+v", before, st.Playback)
	}
}

func TestLeaveAndEnd(t *testing.T) {
	pe := newPartyEnv(t)
	code := pe.create(t, model.PolicyEveryone).InviteCode
	pe.parties.Join(pe.ctx, pe.guest, code)
	pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{pe.tracks[0].ID})
	pe.pub.take()

	if err := pe.parties.Leave(pe.ctx, pe.guest, code); err != nil {
		t.Fatal(err)
	}
	ev := pe.pub.take()
	if len(ev) != 2 || ev[0].name != "removed" || ev[0].user != pe.guest.ID || ev[1].name != "state" || len(ev[1].state.Members) != 1 {
		t.Fatalf("guest leave removes guest stream then publishes state: %+v", ev)
	}
	wantAppErr(t, pe.parties.Leave(pe.ctx, pe.guest, code), 403, "User is not in party")

	pe.parties.Join(pe.ctx, pe.guest, code)
	pe.pub.take()
	if err := pe.parties.Leave(pe.ctx, pe.host, code); err != nil {
		t.Fatal(err)
	}
	ev = pe.pub.take()
	if len(ev) != 1 || ev[0].name != "ended" {
		t.Fatalf("host leave ends party: %+v", ev)
	}
	if e := pe.count(t, "party_members"); e != 0 {
		t.Fatalf("members remain: %d", e)
	}
	if e := pe.count(t, "party_queue_items"); e != 0 {
		t.Fatalf("queue remains: %d", e)
	}
	wantAppErr(t, pe.parties.End(pe.ctx, pe.host, code), 404, "Party not found")
}

func TestFailedMutationPublishesNothing(t *testing.T) {
	pe := newPartyEnv(t)
	code := pe.create(t, model.PolicyEveryone).InviteCode
	pe.pub.take()
	if _, err := pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{pe.tracks[0].ID, uuid.New()}); err == nil {
		t.Fatal("expected error")
	}
	if ev := pe.pub.take(); len(ev) != 0 {
		t.Fatalf("rolled back mutation published: %+v", ev)
	}
	if n := pe.count(t, "party_queue_items"); n != 0 {
		t.Fatalf("partial batch persisted: %d", n)
	}
}

func TestCloseIdleParties(t *testing.T) {
	pe := newPartyEnv(t)
	idle := pe.create(t, model.PolicyEveryone).InviteCode
	playing, _ := pe.parties.Create(pe.ctx, pe.guest, CreatePartyInput{Name: "p", QueuePolicy: model.PolicyEveryone})
	pe.parties.AddTracks(pe.ctx, pe.guest, playing.InviteCode, []uuid.UUID{pe.tracks[0].ID})
	third := pe.user(t, "third", model.RoleListener)
	recent, _ := pe.parties.Create(pe.ctx, third, CreatePartyInput{Name: "r", QueuePolicy: model.PolicyEveryone})
	fourth := pe.user(t, "fourth", model.RoleListener)
	orphan, _ := pe.parties.Create(pe.ctx, fourth, CreatePartyInput{Name: "o", QueuePolicy: model.PolicyEveryone})
	pe.db.Where("party_id = ?", orphan.ID).Delete(&model.PartyPlaybackState{})

	pe.clock = pe.clock.Add(4 * time.Minute)
	pe.parties.Pause(pe.ctx, third, recent.InviteCode, 0)
	pe.clock = pe.clock.Add(90 * time.Second)
	pe.pub.take()

	n, err := pe.parties.CloseIdle(pe.ctx)
	if err != nil || n != 2 {
		t.Fatalf("closed %d %v", n, err)
	}
	ended := []string{}
	for _, ev := range pe.pub.take() {
		if ev.name == "ended" {
			ended = append(ended, ev.code)
		}
	}
	slices.Sort(ended)
	want := []string{idle, orphan.InviteCode}
	slices.Sort(want)
	if !slices.Equal(ended, want) {
		t.Fatalf("ended %v want %v", ended, want)
	}
	if _, err := pe.parties.State(pe.ctx, pe.guest, playing.InviteCode); err != nil {
		t.Fatalf("playing party must survive: %v", err)
	}
	if _, err := pe.parties.State(pe.ctx, third, recent.InviteCode); err != nil {
		t.Fatalf("recently paused party must survive: %v", err)
	}
}

func TestGenerateInviteCode(t *testing.T) {
	seen := map[string]bool{}
	for range 200 {
		c, err := generateInviteCode()
		if err != nil || len(c) != 8 {
			t.Fatalf("%q %v", c, err)
		}
		seen[c] = true
	}
	if len(seen) < 199 {
		t.Fatalf("codes not random enough: %d unique", len(seen))
	}
}

func TestCloseIdleClosesAbandonedPlayingParty(t *testing.T) {
	pe := newPartyEnv(t)
	code := pe.create(t, model.PolicyEveryone).InviteCode
	pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{pe.tracks[0].ID})
	pe.parties.Seek(pe.ctx, pe.host, code, 40)

	pe.clock = pe.clock.Add(60*time.Second + partyIdleWindow - time.Second)
	if n, _ := pe.parties.CloseIdle(pe.ctx); n != 0 {
		t.Fatal("party closed before track end + idle window")
	}
	pe.clock = pe.clock.Add(2 * time.Second)
	if n, _ := pe.parties.CloseIdle(pe.ctx); n != 1 {
		t.Fatal("playing party whose track ended long ago must close")
	}

	unknown := untimedTrack(t, pe, 0)
	code = pe.create(t, model.PolicyEveryone).InviteCode
	pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{unknown.ID})
	pe.clock = pe.clock.Add(time.Hour)
	if n, _ := pe.parties.CloseIdle(pe.ctx); n != 0 {
		t.Fatal("unknown-duration track must get the fallback cap")
	}
	pe.clock = pe.clock.Add(time.Hour + partyIdleWindow + time.Second)
	if n, _ := pe.parties.CloseIdle(pe.ctx); n != 1 {
		t.Fatal("unknown-duration party must close after fallback cap")
	}
}

func untimedTrack(t *testing.T, pe *partyEnv, duration int) *model.Track {
	t.Helper()
	tr := pe.track(t, &model.Album{Base: model.Base{ID: pe.tracks[0].AlbumID}, ArtistID: pe.tracks[0].ArtistID}, "untimed", 9)
	if err := pe.db.Model(tr).Update("duration_seconds", duration).Error; err != nil {
		t.Fatal(err)
	}
	return tr
}

func TestDuplicateTracksInQueueTrackPlayingItem(t *testing.T) {
	pe := newPartyEnv(t)
	code := pe.create(t, model.PolicyEveryone).InviteCode
	a, b := pe.tracks[0].ID, pe.tracks[1].ID
	st, _ := pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{a, b, a})
	before := st.Playback
	pe.clock = pe.clock.Add(time.Minute)

	st, err := pe.parties.RemoveItem(pe.ctx, pe.host, code, st.Queue[2].ID)
	if err != nil || st.Playback.AnchorEpochMs != before.AnchorEpochMs || !slices.Equal(queueTracks(st), []uuid.UUID{a, b}) {
		t.Fatalf("removing a later duplicate must not restart playback: %+v %v", st.Playback, err)
	}

	st, _ = pe.parties.AddTracks(pe.ctx, pe.host, code, []uuid.UUID{a})
	playing, second, dup := st.Queue[0].ID, st.Queue[1].ID, st.Queue[2].ID
	pe.parties.Reorder(pe.ctx, pe.host, code, []uuid.UUID{second, dup, playing})
	st, _ = pe.parties.Next(pe.ctx, pe.host, code)
	itemIDs := ids(st.Queue, func(q dto.PartyQueueItem) uuid.UUID { return q.ID })
	if !slices.Equal(itemIDs, []uuid.UUID{second, dup}) || st.Playback.Track.ID != b {
		t.Fatalf("next must drop the playing item, not an earlier duplicate: %v %+v", itemIDs, st.Playback)
	}
}
