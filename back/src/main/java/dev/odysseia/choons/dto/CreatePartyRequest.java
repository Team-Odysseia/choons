package dev.odysseia.choons.dto;

import dev.odysseia.choons.model.party.PartyQueuePolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreatePartyRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull PartyQueuePolicy queuePolicy
) {}
