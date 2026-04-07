package dev.odysseia.choons.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PartyIdleCleanupJob {

  @Autowired private PartyService partyService;

  @Scheduled(fixedDelay = 60000)
  public void closeIdleParties() {
    partyService.closeIdleParties();
  }
}
