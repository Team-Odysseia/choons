package dev.odysseia.choons.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateListenerRequest(@NotBlank String username, String password) {}
