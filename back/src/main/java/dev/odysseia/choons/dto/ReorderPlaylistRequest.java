package dev.odysseia.choons.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record ReorderPlaylistRequest(@NotNull @NotEmpty List<UUID> orderedTrackIds) {}
