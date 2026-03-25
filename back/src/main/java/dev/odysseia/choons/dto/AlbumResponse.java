package dev.odysseia.choons.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AlbumResponse(UUID id, String title, ArtistResponse artist, int releaseYear, LocalDateTime createdAt) {}
