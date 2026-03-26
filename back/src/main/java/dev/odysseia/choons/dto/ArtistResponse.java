package dev.odysseia.choons.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ArtistResponse(UUID id, String name, String bio, LocalDateTime createdAt, String avatarUrl) {}
