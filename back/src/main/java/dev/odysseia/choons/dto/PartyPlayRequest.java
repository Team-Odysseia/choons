package dev.odysseia.choons.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PartyPlayRequest(@NotNull UUID trackId, double positionSec) {}
