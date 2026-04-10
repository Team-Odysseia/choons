package dev.odysseia.choons.service;

import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyQueueItem;
import dev.odysseia.choons.repository.PartyQueueItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PartyQueueService {

  private final PartyQueueItemRepository partyQueueItemRepository;

  public PartyQueueService(PartyQueueItemRepository partyQueueItemRepository) {
    this.partyQueueItemRepository = partyQueueItemRepository;
  }

  public void normalizePositions(Party party) {
    List<PartyQueueItem> queue = partyQueueItemRepository.findByPartyOrderByPositionAsc(party);
    for (int i = 0; i < queue.size(); i++) {
      PartyQueueItem item = queue.get(i);
      if (item.getPosition() != i) {
        item.setPosition(i);
        partyQueueItemRepository.save(item);
      }
    }
  }
}
