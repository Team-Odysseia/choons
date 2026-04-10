package dev.odysseia.choons.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.UUID;

public record PartyPlayRequest(@NotNull UUID trackId, @PositiveOrZero double positionSec) {}
