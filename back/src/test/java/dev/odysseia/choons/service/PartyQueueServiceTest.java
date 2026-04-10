package dev.odysseia.choons.service;

import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyQueueItem;
import dev.odysseia.choons.repository.PartyQueueItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartyQueueServiceTest {

  @Mock PartyQueueItemRepository partyQueueItemRepository;
  @InjectMocks PartyQueueService partyQueueService;

  @Test
  void normalizePositions_updatesOnlyMismatchedItems() {
    Party party = Party.builder().id(UUID.randomUUID()).build();

    PartyQueueItem ok = PartyQueueItem.builder().id(UUID.randomUUID()).position(0).build();
    PartyQueueItem wrong = PartyQueueItem.builder().id(UUID.randomUUID()).position(9).build();

    when(partyQueueItemRepository.findByPartyOrderByPositionAsc(party))
            .thenReturn(new ArrayList<>(List.of(ok, wrong)));

    partyQueueService.normalizePositions(party);

    verify(partyQueueItemRepository, times(1)).save(wrong);
    verify(partyQueueItemRepository, times(0)).save(ok);
  }
}
