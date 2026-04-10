package dev.odysseia.choons.dto;

import dev.odysseia.choons.model.party.PartyQueuePolicy;

import java.util.List;
import java.util.UUID;

public record PartyStateResponse(
        UUID id,
        String inviteCode,
        String name,
        PartyQueuePolicy queuePolicy,
        UUID hostUserId,
        List<PartyMemberResponse> members,
        List<PartyQueueItemResponse> queue,
        PartyPlaybackResponse playback
) {}
