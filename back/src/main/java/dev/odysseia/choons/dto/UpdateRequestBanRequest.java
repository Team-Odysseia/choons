package dev.odysseia.choons.dto;

public record UpdateRequestBanRequest(boolean blocked) {
    // Primitive boolean cannot be null, so @NotNull is not applicable.
    // If needing to enforce presence, use Boolean instead.
}
