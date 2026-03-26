package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.*;
import dev.odysseia.choons.service.AlbumService;
import dev.odysseia.choons.service.ArtistService;
import dev.odysseia.choons.service.TrackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

  @Autowired private ArtistService artistService;
  @Autowired private AlbumService albumService;
  @Autowired private TrackService trackService;

  // ─── Artists ─────────────────────────────────────────────────────────────────

  @PostMapping("/artists")
  public ResponseEntity<ArtistResponse> createArtist(@RequestBody CreateArtistRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(artistService.create(request));
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

  @DeleteMapping("/artists/{id}/avatar")
  public ResponseEntity<Void> deleteArtistAvatar(@PathVariable UUID id) {
    artistService.deleteAvatar(id);
    return ResponseEntity.noContent().build();
  }

  // ─── Albums ──────────────────────────────────────────────────────────────────

  @PostMapping("/albums")
  public ResponseEntity<AlbumResponse> createAlbum(@RequestBody CreateAlbumRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(albumService.create(request));
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

  @DeleteMapping("/albums/{id}/cover")
  public ResponseEntity<Void> deleteAlbumCover(@PathVariable UUID id) {
    albumService.deleteCover(id);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/albums/{albumId}/tracks")
  public ResponseEntity<List<TrackResponse>> updateAlbumTracks(
          @PathVariable UUID albumId,
          @RequestBody List<UpdateTrackRequest> tracks) {
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
          @RequestBody UpdateTrackRequest request) {
    return ResponseEntity.ok(trackService.update(id, request.title(), request.trackNumber()));
  }

  @DeleteMapping("/tracks/{id}")
  public ResponseEntity<Void> deleteTrack(@PathVariable UUID id) {
    trackService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
