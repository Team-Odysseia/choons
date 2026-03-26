package dev.odysseia.choons.dto;

import java.util.UUID;

public record UpdateTrackRequest(UUID id, String title, int trackNumber) {}
