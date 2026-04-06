package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyQueueItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PartyQueueItemRepository extends JpaRepository<PartyQueueItem, UUID> {
  List<PartyQueueItem> findByPartyOrderByPositionAsc(Party party);

  void deleteByParty(Party party);
}
