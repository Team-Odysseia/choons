package dev.odysseia.choons.dto;

import dev.odysseia.choons.model.request.AlbumRequestStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record AlbumRequestResponse(
        UUID id,
        String albumName,
        String artistName,
        String externalUrl,
        AlbumRequestStatus status,
        UUID requesterId,
        String requesterUsername,
        boolean requesterRequestsBlocked,
        String adminNote,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
