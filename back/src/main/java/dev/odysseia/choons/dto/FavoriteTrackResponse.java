package dev.odysseia.choons.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record FavoriteTrackResponse(
        TrackResponse track,
        LocalDateTime favoritedAt
) {}