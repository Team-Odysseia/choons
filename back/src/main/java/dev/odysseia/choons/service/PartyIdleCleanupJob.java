package dev.odysseia.choons.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PartyIdleCleanupJob {

  private final PartyService partyService;

  public PartyIdleCleanupJob(PartyService partyService) {
    this.partyService = partyService;
  }

  @Scheduled(fixedDelay = 60000)
  public void closeIdleParties() {
    partyService.closeIdleParties();
  }
}
