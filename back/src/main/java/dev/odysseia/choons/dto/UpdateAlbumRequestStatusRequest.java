package dev.odysseia.choons.dto;

import dev.odysseia.choons.model.request.AlbumRequestStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateAlbumRequestStatusRequest(@NotNull AlbumRequestStatus status) {}
