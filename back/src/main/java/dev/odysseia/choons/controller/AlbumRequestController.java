package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.AlbumRequestResponse;
import dev.odysseia.choons.dto.SubmitAlbumRequest;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.service.AlbumRequestService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/album-requests")
@PreAuthorize("hasRole('LISTENER')")
public class AlbumRequestController {

  @Autowired private AlbumRequestService albumRequestService;

  @PostMapping
  public ResponseEntity<AlbumRequestResponse> create(
          @Valid @RequestBody SubmitAlbumRequest request,
          @AuthenticationPrincipal User user) {
    return ResponseEntity.status(HttpStatus.CREATED).body(albumRequestService.create(request, user));
  }

  @GetMapping("/mine")
  public ResponseEntity<List<AlbumRequestResponse>> mine(@AuthenticationPrincipal User user) {
    return ResponseEntity.ok(albumRequestService.findMine(user));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal User user) {
    albumRequestService.deleteMine(id, user);
    return ResponseEntity.noContent().build();
  }
}
