package dev.odysseia.choons.dto;

public record PartyPlaybackResponse(
        TrackResponse track,
        boolean playing,
        double anchorPositionSec,
        long anchorEpochMs
) {}
