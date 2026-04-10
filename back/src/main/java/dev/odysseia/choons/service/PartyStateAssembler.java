package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.*;
import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyMember;
import dev.odysseia.choons.model.party.PartyPlaybackState;
import dev.odysseia.choons.model.party.PartyQueueItem;
import dev.odysseia.choons.repository.PartyMemberRepository;
import dev.odysseia.choons.repository.PartyQueueItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PartyStateAssembler {

  private final PartyMemberRepository partyMemberRepository;
  private final PartyQueueItemRepository partyQueueItemRepository;
  private final PartyPlaybackService partyPlaybackService;
  private final TrackService trackService;

  public PartyStateAssembler(PartyMemberRepository partyMemberRepository,
                             PartyQueueItemRepository partyQueueItemRepository,
                             PartyPlaybackService partyPlaybackService,
                             TrackService trackService) {
    this.partyMemberRepository = partyMemberRepository;
    this.partyQueueItemRepository = partyQueueItemRepository;
    this.partyPlaybackService = partyPlaybackService;
    this.trackService = trackService;
  }

  public PartyStateResponse assemble(Party party) {
    List<PartyMember> members = partyMemberRepository.findByPartyOrderByJoinedAtAsc(party);
    List<PartyQueueItem> queue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    PartyPlaybackState playback = partyPlaybackService.getOrCreatePlayback(party);

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
            )
    );
  }
}
