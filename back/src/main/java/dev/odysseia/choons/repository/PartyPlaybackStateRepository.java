package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyPlaybackState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PartyPlaybackStateRepository extends JpaRepository<PartyPlaybackState, UUID> {
  Optional<PartyPlaybackState> findByParty(Party party);
}
