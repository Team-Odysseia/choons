package dev.odysseia.choons.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PlaylistResponse(
        UUID id,
        String name,
        UUID ownerId,
        List<TrackResponse> tracks,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
