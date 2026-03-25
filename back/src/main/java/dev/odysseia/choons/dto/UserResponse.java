package dev.odysseia.choons.dto;

import dev.odysseia.choons.model.user.UserRole;

import java.util.UUID;

public record UserResponse(UUID id, String username, UserRole role) {}
