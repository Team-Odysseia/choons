package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.*;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.service.PlaylistService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.file.AccessDeniedException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/playlists")
public class PlaylistController {

  private final PlaylistService playlistService;

  public PlaylistController(PlaylistService playlistService) {
    this.playlistService = playlistService;
  }

  @PostMapping
  public ResponseEntity<PlaylistResponse> create(
          @Valid @RequestBody CreatePlaylistRequest request,
          @AuthenticationPrincipal User user) throws AccessDeniedException {
    return ResponseEntity.status(HttpStatus.CREATED).body(playlistService.create(request, user));
  }

  @GetMapping
  public ResponseEntity<List<PlaylistSummaryResponse>> list(@AuthenticationPrincipal User user) {
    return ResponseEntity.ok(playlistService.findByOwner(user));
  }

  @GetMapping("/public")
  public ResponseEntity<List<PlaylistSummaryResponse>> listPublic(@AuthenticationPrincipal User user) {
    return ResponseEntity.ok(playlistService.findAllPublic(user));
  }

  @GetMapping("/{id}")
  public ResponseEntity<PlaylistResponse> get(
          @PathVariable UUID id,
          @AuthenticationPrincipal User user) throws AccessDeniedException {
    return ResponseEntity.ok(playlistService.findById(id, user));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
          @PathVariable UUID id,
          @AuthenticationPrincipal User user) throws AccessDeniedException {
    playlistService.delete(id, user);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/tracks")
  public ResponseEntity<PlaylistResponse> addTrack(
          @PathVariable UUID id,
          @Valid @RequestBody AddTrackToPlaylistRequest request,
          @AuthenticationPrincipal User user) throws AccessDeniedException {
    return ResponseEntity.ok(playlistService.addTrack(id, request, user));
  }

  @DeleteMapping("/{id}/tracks/{trackId}")
  public ResponseEntity<PlaylistResponse> removeTrack(
          @PathVariable UUID id,
          @PathVariable UUID trackId,
          @AuthenticationPrincipal User user) throws AccessDeniedException {
    return ResponseEntity.ok(playlistService.removeTrack(id, trackId, user));
  }

  @PutMapping("/{id}/visibility")
  public ResponseEntity<PlaylistResponse> setVisibility(
          @PathVariable UUID id,
          @Valid @RequestBody VisibilityRequest request,
          @AuthenticationPrincipal User user) throws AccessDeniedException {
    return ResponseEntity.ok(playlistService.setVisibility(id, request.isPublic(), user));
  }

  @PutMapping("/{id}/tracks/order")
  public ResponseEntity<PlaylistResponse> reorder(
          @PathVariable UUID id,
          @Valid @RequestBody ReorderPlaylistRequest request,
          @AuthenticationPrincipal User user) throws AccessDeniedException {
    return ResponseEntity.ok(playlistService.reorder(id, request, user));
  }
}
