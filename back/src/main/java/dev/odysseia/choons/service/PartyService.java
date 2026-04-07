package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.*;
import dev.odysseia.choons.model.party.*;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.*;

@Service
public class PartyService {

  private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final long IDLE_TIMEOUT_MS = 5 * 60 * 1000;

  @Autowired private PartyRepository partyRepository;
  @Autowired private PartyMemberRepository partyMemberRepository;
  @Autowired private PartyQueueItemRepository partyQueueItemRepository;
  @Autowired private PartyPlaybackStateRepository partyPlaybackStateRepository;
  @Autowired private TrackService trackService;
  @Autowired private PartyEventsService partyEventsService;

  @Transactional
  public PartyStateResponse create(CreatePartyRequest request, User hostUser) {
    disconnectActiveMembership(hostUser);

    String name = request.name() == null ? "" : request.name().trim();
    if (name.isBlank()) {
      throw new IllegalArgumentException("Party name is required");
    }

    Party party = partyRepository.save(Party.builder()
            .inviteCode(generateInviteCode())
            .name(name)
            .host(hostUser)
            .queuePolicy(request.queuePolicy())
            .status(PartyStatus.ACTIVE)
            .build());

    partyMemberRepository.save(PartyMember.builder()
            .party(party)
            .user(hostUser)
            .host(true)
            .dj(true)
            .connected(true)
            .build());

    partyPlaybackStateRepository.save(PartyPlaybackState.builder()
            .party(party)
            .track(null)
            .playing(false)
            .anchorPositionSec(0)
            .anchorEpochMs(System.currentTimeMillis())
            .build());

    return stateAndPublish(party, hostUser);
  }

  @Transactional
  public PartyStateResponse join(JoinPartyRequest request, User user) {
    disconnectActiveMembership(user);

    String inviteCode = request.inviteCode().trim().toUpperCase(Locale.ROOT);
    Party party = partyRepository.findByInviteCodeAndStatus(inviteCode, PartyStatus.ACTIVE)
            .orElseThrow(() -> new NoSuchElementException("Party not found"));

    partyMemberRepository.findByPartyAndUser(party, user)
            .ifPresentOrElse(
                    member -> member.setConnected(true),
                    () -> partyMemberRepository.save(PartyMember.builder()
                            .party(party)
                            .user(user)
                            .host(false)
                            .dj(false)
                            .connected(true)
                            .build())
            );

    return stateAndPublish(party, user);
  }

  public PartyStateResponse getMyParty(User user) {
    PartyMember member = partyMemberRepository.findByUserAndConnectedTrue(user)
            .orElseThrow(() -> new NoSuchElementException("No active party"));
    return getStateForParty(member.getParty(), user);
  }

  public PartyStateResponse getState(String inviteCode, User user) {
    Party party = getActiveParty(inviteCode);
    requireMember(party, user);
    return getStateForParty(party, user);
  }

  @Transactional
  public void leave(String inviteCode, User user) {
    Party party = getActiveParty(inviteCode);
    PartyMember member = requireMember(party, user);

    if (member.isHost()) {
      end(inviteCode, user);
      return;
    }

    partyMemberRepository.delete(member);
    partyEventsService.publishState(party.getInviteCode(), getStateForParty(party, party.getHost()));
  }

  @Transactional
  public void end(String inviteCode, User user) {
    Party party = getActiveParty(inviteCode);
    requireHost(party, user);
    closeParty(party);
  }

  @Transactional
  public int closeIdleParties() {
    long now = System.currentTimeMillis();
    int closed = 0;

    List<Party> activeParties = partyRepository.findByStatus(PartyStatus.ACTIVE);
    for (Party party : activeParties) {
      PartyPlaybackState playback = partyPlaybackStateRepository.findByParty(party).orElse(null);

      if (playback == null) {
        closeParty(party);
        closed++;
        continue;
      }

      if (playback.isPlaying()) {
        continue;
      }

      long idleMs = now - playback.getAnchorEpochMs();
      if (idleMs >= IDLE_TIMEOUT_MS) {
        closeParty(party);
        closed++;
      }
    }

    return closed;
  }

  @Transactional
  public PartyStateResponse setDj(String inviteCode, UUID userId, UpdatePartyMemberDjRequest request, User hostUser) {
    Party party = getActiveParty(inviteCode);
    requireHost(party, hostUser);

    PartyMember target = partyMemberRepository.findByPartyOrderByJoinedAtAsc(party).stream()
            .filter(m -> m.getUser().getId().equals(userId))
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Party member not found"));

    if (target.isHost()) {
      throw new IllegalArgumentException("Host is always DJ");
    }
    target.setDj(request.dj());
    return stateAndPublish(party, hostUser);
  }

  @Transactional
  public PartyStateResponse kick(String inviteCode, UUID userId, User hostUser) {
    Party party = getActiveParty(inviteCode);
    requireHost(party, hostUser);

    PartyMember target = partyMemberRepository.findByPartyOrderByJoinedAtAsc(party).stream()
            .filter(m -> m.getUser().getId().equals(userId))
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Party member not found"));

    if (target.isHost()) {
      throw new IllegalArgumentException("Cannot kick host");
    }

    partyMemberRepository.delete(target);
    return stateAndPublish(party, hostUser);
  }

  @Transactional
  public PartyStateResponse addQueueTrack(String inviteCode, AddPartyQueueTrackRequest request, User user) {
    Party party = getActiveParty(inviteCode);
    requireCanControl(party, user);

    List<PartyQueueItem> queue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    int nextPos = queue.size();

    PartyQueueItem added = partyQueueItemRepository.save(PartyQueueItem.builder()
            .party(party)
            .track(trackService.getTrackEntity(request.trackId()))
            .addedBy(user)
            .position(nextPos)
            .build());

    if (queue.isEmpty()) {
      PartyPlaybackState state = getOrCreatePlayback(party);
      state.setTrack(added.getTrack());
      state.setPlaying(true);
      state.setAnchorPositionSec(0);
      state.setAnchorEpochMs(System.currentTimeMillis());
      partyPlaybackStateRepository.save(state);
    }

    return stateAndPublish(party, user);
  }

  @Transactional
  public PartyStateResponse addQueueTracks(String inviteCode, AddPartyQueueTracksRequest request, User user) {
    if (request.trackIds().isEmpty()) {
      throw new IllegalArgumentException("At least one track is required");
    }

    Party party = getActiveParty(inviteCode);
    requireCanControl(party, user);

    List<PartyQueueItem> queue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    int nextPos = queue.size();

    for (UUID trackId : request.trackIds()) {
      partyQueueItemRepository.save(PartyQueueItem.builder()
              .party(party)
              .track(trackService.getTrackEntity(trackId))
              .addedBy(user)
              .position(nextPos++)
              .build());
    }

    if (queue.isEmpty()) {
      PartyPlaybackState state = getOrCreatePlayback(party);
      List<PartyQueueItem> updatedQueue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
      if (!updatedQueue.isEmpty()) {
        state.setTrack(updatedQueue.get(0).getTrack());
        state.setPlaying(true);
        state.setAnchorPositionSec(0);
        state.setAnchorEpochMs(System.currentTimeMillis());
        partyPlaybackStateRepository.save(state);
      }
    }

    return stateAndPublish(party, user);
  }

  @Transactional
  public PartyStateResponse removeQueueTrack(String inviteCode, UUID itemId, User user) {
    Party party = getActiveParty(inviteCode);
    requireCanControl(party, user);

    List<PartyQueueItem> queue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    PartyQueueItem target = queue.stream().filter(i -> i.getId().equals(itemId)).findFirst()
            .orElseThrow(() -> new NoSuchElementException("Queue item not found"));
    partyQueueItemRepository.delete(target);

    normalizePositions(party);
    PartyPlaybackState state = getOrCreatePlayback(party);
    if (state.getTrack() != null && state.getTrack().getId().equals(target.getTrack().getId())) {
      List<PartyQueueItem> updatedQueue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
      if (updatedQueue.isEmpty()) {
        state.setTrack(null);
        state.setPlaying(false);
        state.setAnchorPositionSec(0);
      } else {
        state.setTrack(updatedQueue.get(0).getTrack());
        state.setPlaying(true);
        state.setAnchorPositionSec(0);
      }
      state.setAnchorEpochMs(System.currentTimeMillis());
      partyPlaybackStateRepository.save(state);
    }

    return stateAndPublish(party, user);
  }

  @Transactional
  public PartyStateResponse reorderQueue(String inviteCode, ReorderPartyQueueRequest request, User user) {
    Party party = getActiveParty(inviteCode);
    requireCanControl(party, user);

    List<PartyQueueItem> queue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    if (queue.size() != request.orderedItemIds().size()) {
      throw new IllegalArgumentException("Reorder list size mismatch");
    }

    Map<UUID, PartyQueueItem> byId = new HashMap<>();
    for (PartyQueueItem item : queue) byId.put(item.getId(), item);

    for (int i = 0; i < request.orderedItemIds().size(); i++) {
      UUID id = request.orderedItemIds().get(i);
      PartyQueueItem item = byId.get(id);
      if (item == null) {
        throw new IllegalArgumentException("Invalid queue item in reorder");
      }
      item.setPosition(i);
      partyQueueItemRepository.save(item);
    }

    return stateAndPublish(party, user);
  }

  @Transactional
  public PartyStateResponse play(String inviteCode, PartyPlayRequest request, User user) {
    Party party = getActiveParty(inviteCode);
    requireCanControl(party, user);

    PartyPlaybackState state = getOrCreatePlayback(party);
    state.setTrack(trackService.getTrackEntity(request.trackId()));
    state.setPlaying(true);
    state.setAnchorPositionSec(Math.max(0, request.positionSec()));
    state.setAnchorEpochMs(System.currentTimeMillis());
    partyPlaybackStateRepository.save(state);

    return stateAndPublish(party, user);
  }

  @Transactional
  public PartyStateResponse pause(String inviteCode, PartyPauseRequest request, User user) {
    Party party = getActiveParty(inviteCode);
    requireCanControl(party, user);

    PartyPlaybackState state = getOrCreatePlayback(party);
    state.setPlaying(false);
    state.setAnchorPositionSec(Math.max(0, request.positionSec()));
    state.setAnchorEpochMs(System.currentTimeMillis());
    partyPlaybackStateRepository.save(state);

    return stateAndPublish(party, user);
  }

  @Transactional
  public PartyStateResponse seek(String inviteCode, PartySeekRequest request, User user) {
    Party party = getActiveParty(inviteCode);
    requireCanControl(party, user);

    PartyPlaybackState state = getOrCreatePlayback(party);
    state.setAnchorPositionSec(Math.max(0, request.positionSec()));
    state.setAnchorEpochMs(System.currentTimeMillis());
    partyPlaybackStateRepository.save(state);

    return stateAndPublish(party, user);
  }

  @Transactional
  public PartyStateResponse next(String inviteCode, User user) {
    Party party = getActiveParty(inviteCode);
    requireCanControl(party, user);

    PartyPlaybackState state = getOrCreatePlayback(party);

    List<PartyQueueItem> queue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    if (queue.isEmpty()) {
      state.setTrack(null);
      state.setPlaying(false);
      state.setAnchorPositionSec(0);
      state.setAnchorEpochMs(System.currentTimeMillis());
      partyPlaybackStateRepository.save(state);
      return stateAndPublish(party, user);
    }

    UUID currentTrackId = state.getTrack() == null ? null : state.getTrack().getId();
    if (currentTrackId != null) {
      PartyQueueItem currentItem = queue.stream()
              .filter(i -> i.getTrack().getId().equals(currentTrackId))
              .findFirst()
              .orElse(null);
      if (currentItem != null) {
        partyQueueItemRepository.delete(currentItem);
        normalizePositions(party);
      }
    }

    List<PartyQueueItem> updatedQueue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    if (updatedQueue.isEmpty()) {
      state.setTrack(null);
      state.setPlaying(false);
      state.setAnchorPositionSec(0);
    } else {
      state.setTrack(updatedQueue.get(0).getTrack());
      state.setPlaying(true);
      state.setAnchorPositionSec(0);
    }
    state.setAnchorEpochMs(System.currentTimeMillis());
    partyPlaybackStateRepository.save(state);

    return stateAndPublish(party, user);
  }

  @Transactional
  public PartyStateResponse prev(String inviteCode, User user) {
    Party party = getActiveParty(inviteCode);
    requireCanControl(party, user);

    PartyPlaybackState state = getOrCreatePlayback(party);
    if (state.getTrack() == null) {
      return stateAndPublish(party, user);
    }

    state.setTrack(trackService.getTrackEntity(state.getTrack().getId()));
    state.setPlaying(true);
    state.setAnchorPositionSec(0);
    state.setAnchorEpochMs(System.currentTimeMillis());
    partyPlaybackStateRepository.save(state);
    return stateAndPublish(party, user);
  }

  private void normalizePositions(Party party) {
    List<PartyQueueItem> queue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    for (int i = 0; i < queue.size(); i++) {
      PartyQueueItem item = queue.get(i);
      if (item.getPosition() != i) {
        item.setPosition(i);
        partyQueueItemRepository.save(item);
      }
    }
  }

  private PartyPlaybackState getOrCreatePlayback(Party party) {
    return partyPlaybackStateRepository.findByParty(party)
            .orElseGet(() -> partyPlaybackStateRepository.save(PartyPlaybackState.builder()
                    .party(party)
                    .playing(false)
                    .anchorPositionSec(0)
                    .anchorEpochMs(System.currentTimeMillis())
                    .build()));
  }

  private Party getActiveParty(String inviteCode) {
    return partyRepository.findByInviteCodeAndStatus(inviteCode.toUpperCase(Locale.ROOT), PartyStatus.ACTIVE)
            .orElseThrow(() -> new NoSuchElementException("Party not found"));
  }

  private PartyMember requireMember(Party party, User user) {
    return partyMemberRepository.findByPartyAndUser(party, user)
            .orElseThrow(() -> new AccessDeniedException("User is not in party"));
  }

  private void requireHost(Party party, User user) {
    PartyMember member = requireMember(party, user);
    if (!member.isHost()) {
      throw new AccessDeniedException("Only host can perform this action");
    }
  }

  private void requireCanControl(Party party, User user) {
    PartyMember member = requireMember(party, user);
    if (member.isHost()) return;
    if (party.getQueuePolicy() == PartyQueuePolicy.EVERYONE) return;
    if (member.isDj()) return;
    throw new AccessDeniedException("Only DJs can control queue in this party");
  }

  private PartyStateResponse getStateForParty(Party party, User requester) {
    List<PartyMember> members = partyMemberRepository.findByPartyOrderByJoinedAtAsc(party);
    List<PartyQueueItem> queue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    PartyPlaybackState playback = getOrCreatePlayback(party);

    boolean canControl = false;
    for (PartyMember member : members) {
      if (member.getUser().getId().equals(requester.getId())) {
        canControl = member.isHost() || party.getQueuePolicy() == PartyQueuePolicy.EVERYONE || member.isDj();
      }
    }

    TrackResponse playbackTrack = playback.getTrack() == null ? null : trackService.toResponse(playback.getTrack());

    return new PartyStateResponse(
            party.getId(),
            party.getInviteCode(),
            party.getName(),
            party.getQueuePolicy(),
            party.getHost().getId(),
            members.stream()
                    .map(m -> new PartyMemberResponse(
                            m.getUser().getId(),
                            m.getUser().getUsername(),
                            m.isHost(),
                            m.isDj(),
                            m.isConnected()
                    ))
                    .toList(),
            queue.stream()
                    .map(item -> new PartyQueueItemResponse(
                            item.getId(),
                            item.getPosition(),
                            trackService.toResponse(item.getTrack()),
                            item.getAddedBy().getId(),
                            item.getAddedBy().getUsername()
                    ))
                    .toList(),
            new PartyPlaybackResponse(
                    playbackTrack,
                    playback.isPlaying(),
                    playback.getAnchorPositionSec(),
                    playback.getAnchorEpochMs()
            ),
            canControl
    );
  }

  private String generateInviteCode() {
    for (int attempt = 0; attempt < 20; attempt++) {
      StringBuilder sb = new StringBuilder(8);
      for (int i = 0; i < 8; i++) {
        sb.append(CODE_CHARS[RANDOM.nextInt(CODE_CHARS.length)]);
      }
      String code = sb.toString();
      if (!partyRepository.existsByInviteCode(code)) {
        return code;
      }
    }
    throw new IllegalStateException("Failed to generate invite code");
  }

  private void disconnectActiveMembership(User user) {
    partyMemberRepository.findByUserAndConnectedTrue(user).ifPresent(member -> {
      if (member.isHost()) {
        closeParty(member.getParty());
      } else {
        partyMemberRepository.delete(member);
      }
    });
  }

  private void closeParty(Party party) {
    if (party.getStatus() == PartyStatus.ENDED) {
      return;
    }
    String inviteCode = party.getInviteCode();
    party.setStatus(PartyStatus.ENDED);
    partyRepository.save(party);
    partyQueueItemRepository.deleteByParty(party);
    partyMemberRepository.findByPartyOrderByJoinedAtAsc(party).forEach(partyMemberRepository::delete);
    partyEventsService.publishEnded(inviteCode);
  }

  private PartyStateResponse stateAndPublish(Party party, User requester) {
    PartyStateResponse state = getStateForParty(party, requester);
    partyEventsService.publishState(party.getInviteCode(), state);
    return state;
  }
}
