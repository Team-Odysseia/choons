package dev.odysseia.choons.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record ReorderPartyQueueRequest(@NotNull List<UUID> orderedItemIds) {}
