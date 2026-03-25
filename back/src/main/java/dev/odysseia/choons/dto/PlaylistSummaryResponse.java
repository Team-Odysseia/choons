package dev.odysseia.choons.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PlaylistSummaryResponse(UUID id, String name, int trackCount, LocalDateTime updatedAt) {}
