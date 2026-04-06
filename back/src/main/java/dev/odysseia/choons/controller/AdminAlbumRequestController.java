package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.AlbumRequestResponse;
import dev.odysseia.choons.dto.UpdateAlbumRequestStatusRequest;
import dev.odysseia.choons.service.AlbumRequestService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/album-requests")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAlbumRequestController {

  @Autowired private AlbumRequestService albumRequestService;

  @GetMapping
  public ResponseEntity<List<AlbumRequestResponse>> listAll() {
    return ResponseEntity.ok(albumRequestService.findAll());
  }

  @PutMapping("/{id}/status")
  public ResponseEntity<AlbumRequestResponse> updateStatus(
          @PathVariable UUID id,
          @Valid @RequestBody UpdateAlbumRequestStatusRequest request) {
    return ResponseEntity.ok(albumRequestService.updateStatus(id, request));
  }
}
