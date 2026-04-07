package dev.odysseia.choons.dto;

import java.util.UUID;

public record ListenerRequestBanResponse(UUID id, String username, boolean requestsBlocked) {}
