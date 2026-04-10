package dev.odysseia.choons.service;

import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyMember;
import dev.odysseia.choons.model.party.PartyQueuePolicy;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.repository.PartyMemberRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class PartyAccessService {

  private final PartyMemberRepository partyMemberRepository;

  public PartyAccessService(PartyMemberRepository partyMemberRepository) {
    this.partyMemberRepository = partyMemberRepository;
  }

  public PartyMember requireMember(Party party, User user) {
    return partyMemberRepository.findByPartyAndUser(party, user)
            .orElseThrow(() -> new AccessDeniedException("User is not in party"));
  }

  public void requireHost(Party party, User user) {
    PartyMember member = requireMember(party, user);
    if (!member.isHost()) {
      throw new AccessDeniedException("Only host can perform this action");
    }
  }

  public void requireCanControl(Party party, User user) {
    PartyMember member = requireMember(party, user);
    if (member.isHost()) return;
    if (party.getQueuePolicy() == PartyQueuePolicy.EVERYONE) return;
    if (member.isDj()) return;
    throw new AccessDeniedException("Only DJs can control queue in this party");
  }
}
