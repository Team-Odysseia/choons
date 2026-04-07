package dev.odysseia.choons.dto;

import java.util.UUID;

public record PartyQueueItemResponse(
        UUID id,
        int position,
        TrackResponse track,
        UUID addedByUserId,
        String addedByUsername
) {}
