package dev.odysseia.choons.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record PartySeekRequest(@PositiveOrZero double positionSec) {}
