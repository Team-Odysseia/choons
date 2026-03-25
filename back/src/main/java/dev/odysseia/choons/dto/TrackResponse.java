package dev.odysseia.choons.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record TrackResponse(
        UUID id,
        String title,
        AlbumResponse album,
        ArtistResponse artist,
        int trackNumber,
        int durationSeconds,
        LocalDateTime createdAt
) {}
