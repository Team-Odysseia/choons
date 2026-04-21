package dev.odysseia.choons.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record UpdateTrackRequest(
        @NotNull UUID id,
        @NotBlank String title,
        @PositiveOrZero int trackNumber) {}
