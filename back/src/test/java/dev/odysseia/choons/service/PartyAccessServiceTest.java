package dev.odysseia.choons.service;

import dev.odysseia.choons.model.party.Party;
import dev.odysseia.choons.model.party.PartyMember;
import dev.odysseia.choons.model.party.PartyQueuePolicy;
import dev.odysseia.choons.model.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import dev.odysseia.choons.repository.PartyMemberRepository;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartyAccessServiceTest {

  @Mock PartyMemberRepository partyMemberRepository;
  @InjectMocks PartyAccessService partyAccessService;

  private Party party;
  private User user;

  @BeforeEach
  void setUp() {
    user = User.builder().id(UUID.randomUUID()).username("listener").build();
    party = Party.builder().id(UUID.randomUUID()).queuePolicy(PartyQueuePolicy.DJ_ONLY).build();
  }

  @Test
  void requireCanControl_allowsHost() {
    PartyMember host = PartyMember.builder().party(party).user(user).host(true).dj(false).connected(true).build();
    when(partyMemberRepository.findByPartyAndUser(party, user)).thenReturn(Optional.of(host));

    assertThatCode(() -> partyAccessService.requireCanControl(party, user)).doesNotThrowAnyException();
  }

  @Test
  void requireCanControl_allowsEveryonePolicy() {
    party.setQueuePolicy(PartyQueuePolicy.EVERYONE);
    PartyMember member = PartyMember.builder().party(party).user(user).host(false).dj(false).connected(true).build();
    when(partyMemberRepository.findByPartyAndUser(party, user)).thenReturn(Optional.of(member));

    assertThatCode(() -> partyAccessService.requireCanControl(party, user)).doesNotThrowAnyException();
  }

  @Test
  void requireCanControl_deniesNonDjInDjOnlyParty() {
    PartyMember member = PartyMember.builder().party(party).user(user).host(false).dj(false).connected(true).build();
    when(partyMemberRepository.findByPartyAndUser(party, user)).thenReturn(Optional.of(member));

    assertThatThrownBy(() -> partyAccessService.requireCanControl(party, user))
            .isInstanceOf(AccessDeniedException.class)
            .hasMessageContaining("Only DJs");
  }
}
