package dev.odysseia.choons.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record PartyPauseRequest(@PositiveOrZero double positionSec) {}
