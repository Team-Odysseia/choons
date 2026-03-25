package dev.odysseia.choons.dto;

import java.util.List;
import java.util.UUID;

public record ReorderPlaylistRequest(List<UUID> orderedTrackIds) {}
