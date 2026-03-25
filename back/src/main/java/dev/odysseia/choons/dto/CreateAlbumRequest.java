package dev.odysseia.choons.dto;

import java.util.UUID;

public record CreateAlbumRequest(String title, UUID artistId, int releaseYear) {}
