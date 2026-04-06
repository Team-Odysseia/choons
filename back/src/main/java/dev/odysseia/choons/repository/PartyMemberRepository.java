package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyMember;
import dev.odysseia.choons.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PartyMemberRepository extends JpaRepository<PartyMember, UUID> {
  Optional<PartyMember> findByPartyAndUser(Party party, User user);

  List<PartyMember> findByPartyOrderByJoinedAtAsc(Party party);

  Optional<PartyMember> findByUserAndConnectedTrue(User user);
}
