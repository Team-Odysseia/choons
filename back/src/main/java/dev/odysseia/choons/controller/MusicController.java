package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.AlbumResponse;
import dev.odysseia.choons.dto.ArtistResponse;
import dev.odysseia.choons.dto.TrackResponse;
import dev.odysseia.choons.service.AlbumService;
import dev.odysseia.choons.service.ArtistService;
import dev.odysseia.choons.service.TrackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/music")
public class MusicController {

  @Autowired private ArtistService artistService;
  @Autowired private AlbumService albumService;
  @Autowired private TrackService trackService;

  @GetMapping("/artists")
  public ResponseEntity<List<ArtistResponse>> listArtists(
          @RequestParam(required = false) String query,
          @RequestParam(defaultValue = "0") int page,
          @RequestParam(defaultValue = "100") int size) {
    return ResponseEntity.ok(paginate(artistService.search(query), page, size));
  }

  @GetMapping("/artists/{id}")
  public ResponseEntity<ArtistResponse> getArtist(@PathVariable UUID id) {
    return ResponseEntity.ok(artistService.findById(id));
  }

  @GetMapping("/albums")
  public ResponseEntity<List<AlbumResponse>> listAlbums(
          @RequestParam(required = false) UUID artistId,
          @RequestParam(required = false) String query,
          @RequestParam(defaultValue = "0") int page,
          @RequestParam(defaultValue = "100") int size) {
    return ResponseEntity.ok(paginate(albumService.search(artistId, query), page, size));
  }

  @GetMapping("/albums/{id}")
  public ResponseEntity<AlbumResponse> getAlbum(@PathVariable UUID id) {
    return ResponseEntity.ok(albumService.findById(id));
  }

  @GetMapping("/tracks/{id}")
  public ResponseEntity<TrackResponse> getTrack(@PathVariable UUID id) {
    return ResponseEntity.ok(trackService.findById(id));
  }

  @GetMapping("/tracks")
  public ResponseEntity<List<TrackResponse>> listTracks(
          @RequestParam(required = false) UUID albumId,
          @RequestParam(required = false) String query,
          @RequestParam(defaultValue = "0") int page,
          @RequestParam(defaultValue = "100") int size) {
    return ResponseEntity.ok(paginate(trackService.search(albumId, query), page, size));
  }

  @GetMapping("/tracks/most-played")
  public ResponseEntity<List<TrackResponse>> mostPlayedTracks(
          @RequestParam(defaultValue = "10") int limit) {
    return ResponseEntity.ok(trackService.findMostPlayed(limit));
  }

  private <T> List<T> paginate(List<T> values, int page, int size) {
    int safePage = Math.max(page, 0);
    int safeSize = Math.max(1, Math.min(size, 200));
    int start = safePage * safeSize;
    if (start >= values.size()) {
      return List.of();
    }
    int end = Math.min(start + safeSize, values.size());
    return values.subList(start, end);
  }
}
