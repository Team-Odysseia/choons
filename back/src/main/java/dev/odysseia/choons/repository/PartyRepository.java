package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface PartyRepository extends JpaRepository<Party, UUID> {
  Optional<Party> findByInviteCodeAndStatus(String inviteCode, PartyStatus status);

  boolean existsByInviteCode(String inviteCode);

  List<Party> findByStatus(PartyStatus status);
}
