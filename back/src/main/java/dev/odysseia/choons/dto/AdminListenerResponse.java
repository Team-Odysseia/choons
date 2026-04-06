package dev.odysseia.choons.dto;

import java.util.UUID;

public record AdminListenerResponse(UUID id, String username, boolean requestsBlocked) {}
