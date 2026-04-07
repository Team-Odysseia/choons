package dev.odysseia.choons.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinPartyRequest(@NotBlank @Size(min = 8, max = 8) String inviteCode) {}
