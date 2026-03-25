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

  // Artists
  @PostMapping("/artists")
  public ResponseEntity<ArtistResponse> createArtist(@RequestBody CreateArtistRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(artistService.create(request));
  }

  @GetMapping("/artists")
  public ResponseEntity<List<ArtistResponse>> listArtists() {
    return ResponseEntity.ok(artistService.findAll());
  }

  // Albums
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

  // Tracks
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

  @GetMapping("/tracks")
  public ResponseEntity<List<TrackResponse>> listTracks(@RequestParam(required = false) UUID albumId) {
    List<TrackResponse> tracks = albumId != null
            ? trackService.findByAlbum(albumId)
            : trackService.findAll();
    return ResponseEntity.ok(tracks);
  }
}
