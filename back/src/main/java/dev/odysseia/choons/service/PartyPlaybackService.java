package dev.odysseia.choons.service;

import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyPlaybackState;
import dev.odysseia.choons.repository.PartyPlaybackStateRepository;
import org.springframework.stereotype.Service;

@Service
public class PartyPlaybackService {

  private final PartyPlaybackStateRepository partyPlaybackStateRepository;

  public PartyPlaybackService(PartyPlaybackStateRepository partyPlaybackStateRepository) {
    this.partyPlaybackStateRepository = partyPlaybackStateRepository;
  }

  public PartyPlaybackState getOrCreatePlayback(Party party) {
    return partyPlaybackStateRepository.findByParty(party)
            .orElseGet(() -> partyPlaybackStateRepository.save(PartyPlaybackState.builder()
                    .party(party)
                    .playing(false)
                    .anchorPositionSec(0)
                    .anchorEpochMs(System.currentTimeMillis())
                    .build()));
  }
}
