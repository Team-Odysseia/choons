package dev.odysseia.choons.dto;

import java.util.UUID;

public record PartyMemberResponse(
        UUID userId,
        String username,
        boolean host,
        boolean dj,
        boolean connected
) {}
