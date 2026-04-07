package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.*;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.service.PartyEventsService;
import dev.odysseia.choons.service.PartyService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/parties")
public class PartyController {

  @Autowired private PartyService partyService;
  @Autowired private PartyEventsService partyEventsService;

  @PostMapping
  public ResponseEntity<PartyStateResponse> create(
          @Valid @RequestBody CreatePartyRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.status(HttpStatus.CREATED).body(partyService.create(request, user));
  }

  @PostMapping("/join")
  public ResponseEntity<PartyStateResponse> join(
          @Valid @RequestBody JoinPartyRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.join(request, user));
  }

  @GetMapping("/me")
  public ResponseEntity<PartyStateResponse> me(@AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.getMyParty(user));
  }

  @GetMapping("/{inviteCode}/state")
  public ResponseEntity<PartyStateResponse> state(
          @PathVariable String inviteCode,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.getState(inviteCode, user));
  }

  @GetMapping(value = "/{inviteCode}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter events(
          @PathVariable String inviteCode,
          @AuthenticationPrincipal User user) {
    PartyStateResponse state = partyService.getState(inviteCode, user);
    SseEmitter emitter = partyEventsService.subscribe(inviteCode);
    partyEventsService.sendInitialState(emitter, state);
    return emitter;
  }

  @PostMapping("/{inviteCode}/leave")
  public ResponseEntity<Void> leave(@PathVariable String inviteCode, @AuthenticationPrincipal User user) {
    partyService.leave(inviteCode, user);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{inviteCode}/end")
  public ResponseEntity<Void> end(@PathVariable String inviteCode, @AuthenticationPrincipal User user) {
    partyService.end(inviteCode, user);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{inviteCode}/members/{userId}/kick")
  public ResponseEntity<PartyStateResponse> kick(
          @PathVariable String inviteCode,
          @PathVariable UUID userId,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.kick(inviteCode, userId, user));
  }

  @PostMapping("/{inviteCode}/members/{userId}/dj")
  public ResponseEntity<PartyStateResponse> setDj(
          @PathVariable String inviteCode,
          @PathVariable UUID userId,
          @RequestBody UpdatePartyMemberDjRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.setDj(inviteCode, userId, request, user));
  }

  @PostMapping("/{inviteCode}/queue")
  public ResponseEntity<PartyStateResponse> addQueueTrack(
          @PathVariable String inviteCode,
          @Valid @RequestBody AddPartyQueueTrackRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.addQueueTrack(inviteCode, request, user));
  }

  @PostMapping("/{inviteCode}/queue/batch")
  public ResponseEntity<PartyStateResponse> addQueueTracks(
          @PathVariable String inviteCode,
          @Valid @RequestBody AddPartyQueueTracksRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.addQueueTracks(inviteCode, request, user));
  }

  @DeleteMapping("/{inviteCode}/queue/{itemId}")
  public ResponseEntity<PartyStateResponse> removeQueueTrack(
          @PathVariable String inviteCode,
          @PathVariable UUID itemId,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.removeQueueTrack(inviteCode, itemId, user));
  }

  @PutMapping("/{inviteCode}/queue/reorder")
  public ResponseEntity<PartyStateResponse> reorderQueue(
          @PathVariable String inviteCode,
          @Valid @RequestBody ReorderPartyQueueRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.reorderQueue(inviteCode, request, user));
  }

  @PostMapping("/{inviteCode}/playback/play")
  public ResponseEntity<PartyStateResponse> play(
          @PathVariable String inviteCode,
          @Valid @RequestBody PartyPlayRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.play(inviteCode, request, user));
  }

  @PostMapping("/{inviteCode}/playback/pause")
  public ResponseEntity<PartyStateResponse> pause(
          @PathVariable String inviteCode,
          @RequestBody PartyPauseRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.pause(inviteCode, request, user));
  }

  @PostMapping("/{inviteCode}/playback/seek")
  public ResponseEntity<PartyStateResponse> seek(
          @PathVariable String inviteCode,
          @RequestBody PartySeekRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.seek(inviteCode, request, user));
  }

  @PostMapping("/{inviteCode}/playback/next")
  public ResponseEntity<PartyStateResponse> next(
          @PathVariable String inviteCode,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.next(inviteCode, user));
  }

  @PostMapping("/{inviteCode}/playback/prev")
  public ResponseEntity<PartyStateResponse> prev(
          @PathVariable String inviteCode,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(partyService.prev(inviteCode, user));
  }
}
