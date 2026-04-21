package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.AlbumResponse;
import dev.odysseia.choons.dto.AdminListenerResponse;
import dev.odysseia.choons.dto.ArtistResponse;
import dev.odysseia.choons.dto.ListenerRequestBanResponse;
import dev.odysseia.choons.dto.TrackResponse;
import dev.odysseia.choons.dto.UpdateListenerRequest;
import dev.odysseia.choons.dto.UpdateRequestBanRequest;
import dev.odysseia.choons.dto.UpdateLrclibIdRequest;
import dev.odysseia.choons.dto.UpdateTrackRequest;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.UserRepository;
import dev.odysseia.choons.service.AlbumRequestService;
import dev.odysseia.choons.service.AlbumService;
import dev.odysseia.choons.service.ArtistService;
import dev.odysseia.choons.service.TrackService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

  private final ArtistService artistService;
  private final AlbumService albumService;
  private final TrackService trackService;
  private final AlbumRequestService albumRequestService;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public AdminController(ArtistService artistService, AlbumService albumService,
                         TrackService trackService, AlbumRequestService albumRequestService,
                         UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.artistService = artistService;
    this.albumService = albumService;
    this.trackService = trackService;
    this.albumRequestService = albumRequestService;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @GetMapping("/listeners")
  public ResponseEntity<List<AdminListenerResponse>> listListeners(@RequestParam(required = false) String query) {
    String filter = query == null ? "" : query.trim();
    List<User> listeners = filter.isEmpty()
            ? userRepository.findByRoleOrderByUsernameAsc(UserRole.LISTENER)
            : userRepository.findByRoleAndUsernameContainingIgnoreCaseOrderByUsernameAsc(UserRole.LISTENER, filter);
    return ResponseEntity.ok(listeners.stream()
            .map(u -> new AdminListenerResponse(u.getId(), u.getUsername(), u.isRequestsBlocked()))
            .toList());
  }

  @PutMapping("/listeners/{id}")
  public ResponseEntity<AdminListenerResponse> updateListener(
          @PathVariable UUID id,
          @Valid @RequestBody UpdateListenerRequest request) {
    User listener = userRepository.findById(id)
            .filter(u -> u.getRole() == UserRole.LISTENER)
            .orElseThrow(() -> new NoSuchElementException("Listener not found: " + id));

    String username = request.username() == null ? "" : request.username().trim();
    if (username.isBlank()) {
      throw new IllegalArgumentException("Username is required");
    }

    userRepository.findByUsername(username)
            .filter(existing -> !existing.getId().equals(listener.getId()))
            .ifPresent(existing -> {
              throw new IllegalArgumentException("Username already in use");
            });

    listener.setUsername(username);
    String password = request.password();
    if (password != null && !password.isBlank()) {
      listener.setPassword(passwordEncoder.encode(password));
    }

    User saved = userRepository.save(listener);
    return ResponseEntity.ok(new AdminListenerResponse(saved.getId(), saved.getUsername(), saved.isRequestsBlocked()));
  }

  @DeleteMapping("/listeners/{id}")
  public ResponseEntity<Void> deleteListener(@PathVariable UUID id) {
    User listener = userRepository.findById(id)
            .filter(u -> u.getRole() == UserRole.LISTENER)
            .orElseThrow(() -> new NoSuchElementException("Listener not found: " + id));
    userRepository.delete(listener);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/listeners/{id}/request-ban")
  public ResponseEntity<ListenerRequestBanResponse> setRequestBan(
          @PathVariable UUID id,
          @Valid @RequestBody UpdateRequestBanRequest request) {
    return ResponseEntity.ok(albumRequestService.setRequestBan(id, request));
  }

  // ─── Artists ─────────────────────────────────────────────────────────────────

  @PostMapping(value = "/artists", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ArtistResponse> createArtist(
          @RequestParam String name,
          @RequestParam(required = false) String bio,
          @RequestPart(value = "avatarFile", required = false) MultipartFile avatarFile) throws IOException {
    return ResponseEntity.status(HttpStatus.CREATED).body(artistService.create(name, bio, avatarFile));
  }

  @GetMapping("/artists")
  public ResponseEntity<List<ArtistResponse>> listArtists() {
    return ResponseEntity.ok(artistService.findAll());
  }

  @GetMapping("/artists/{id}")
  public ResponseEntity<ArtistResponse> getArtist(@PathVariable UUID id) {
    return ResponseEntity.ok(artistService.findById(id));
  }

  @PutMapping(value = "/artists/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ArtistResponse> updateArtist(
          @PathVariable UUID id,
          @RequestParam String name,
          @RequestParam(required = false) String bio,
          @RequestPart(value = "avatarFile", required = false) MultipartFile avatarFile) throws IOException {
    return ResponseEntity.ok(artistService.update(id, name, bio, avatarFile));
  }

  @DeleteMapping("/artists/{id}")
  public ResponseEntity<Void> deleteArtist(@PathVariable UUID id) {
    artistService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/artists/{id}/avatar")
  public ResponseEntity<Void> deleteArtistAvatar(@PathVariable UUID id) {
    artistService.deleteAvatar(id);
    return ResponseEntity.noContent().build();
  }

  // ─── Albums ──────────────────────────────────────────────────────────────────

  @PostMapping(value = "/albums", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<AlbumResponse> createAlbum(
          @RequestParam String title,
          @RequestParam UUID artistId,
          @RequestParam int releaseYear,
          @RequestPart(value = "coverFile", required = false) MultipartFile coverFile) throws IOException {
    return ResponseEntity.status(HttpStatus.CREATED).body(albumService.create(title, artistId, releaseYear, coverFile));
  }

  @GetMapping("/albums")
  public ResponseEntity<List<AlbumResponse>> listAlbums(@RequestParam(required = false) UUID artistId) {
    List<AlbumResponse> albums = artistId != null
            ? albumService.findByArtist(artistId)
            : albumService.findAll();
    return ResponseEntity.ok(albums);
  }

  @GetMapping("/albums/{id}")
  public ResponseEntity<AlbumResponse> getAlbum(@PathVariable UUID id) {
    return ResponseEntity.ok(albumService.findById(id));
  }

  @PutMapping(value = "/albums/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<AlbumResponse> updateAlbum(
          @PathVariable UUID id,
          @RequestParam String title,
          @RequestParam UUID artistId,
          @RequestParam int releaseYear,
          @RequestPart(value = "coverFile", required = false) MultipartFile coverFile) throws IOException {
    return ResponseEntity.ok(albumService.update(id, title, artistId, releaseYear, coverFile));
  }

  @DeleteMapping("/albums/{id}")
  public ResponseEntity<Void> deleteAlbum(@PathVariable UUID id) {
    albumService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/albums/{id}/cover")
  public ResponseEntity<Void> deleteAlbumCover(@PathVariable UUID id) {
    albumService.deleteCover(id);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/albums/{albumId}/tracks")
  public ResponseEntity<List<TrackResponse>> updateAlbumTracks(
          @PathVariable UUID albumId,
          @Valid @RequestBody List<UpdateTrackRequest> tracks) {
    return ResponseEntity.ok(trackService.updateAll(albumId, tracks));
  }

  // ─── Tracks ──────────────────────────────────────────────────────────────────

  @PostMapping(value = "/tracks", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<TrackResponse> uploadTrack(
          @RequestParam String title,
          @RequestParam UUID albumId,
          @RequestParam UUID artistId,
          @RequestParam int trackNumber,
          @RequestParam(defaultValue = "0") int durationSeconds,
          @RequestPart("audioFile") MultipartFile audioFile) throws IOException {
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(trackService.upload(title, albumId, artistId, trackNumber, durationSeconds, audioFile));
  }

  @PostMapping(value = "/tracks/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<List<TrackResponse>> uploadBatch(
          @RequestParam UUID albumId,
          @RequestParam UUID artistId,
          @RequestParam List<String> titles,
          @RequestParam List<Integer> durations,
          @RequestParam("files") List<MultipartFile> files) throws IOException {
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(trackService.uploadBatch(albumId, artistId, titles, durations, files));
  }

  @GetMapping("/tracks")
  public ResponseEntity<List<TrackResponse>> listTracks(@RequestParam(required = false) UUID albumId) {
    List<TrackResponse> tracks = albumId != null
            ? trackService.findByAlbum(albumId)
            : trackService.findAll();
    return ResponseEntity.ok(tracks);
  }

  @PutMapping("/tracks/{id}")
  public ResponseEntity<TrackResponse> updateTrack(
          @PathVariable UUID id,
          @Valid @RequestBody UpdateTrackRequest request) {
    return ResponseEntity.ok(trackService.update(id, request.title(), request.trackNumber()));
  }

  @PutMapping("/tracks/{id}/lrclib-id")
  public ResponseEntity<TrackResponse> updateTrackLrclibId(
          @PathVariable UUID id,
          @Valid @RequestBody UpdateLrclibIdRequest request) {
    return ResponseEntity.ok(trackService.updateLrclibId(id, request.lrclibId()));
  }

  @DeleteMapping("/tracks/{id}")
  public ResponseEntity<Void> deleteTrack(@PathVariable UUID id) {
    trackService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
