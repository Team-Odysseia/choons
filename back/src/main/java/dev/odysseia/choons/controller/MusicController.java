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
  public ResponseEntity<List<ArtistResponse>> listArtists() {
    return ResponseEntity.ok(artistService.findAll());
  }

  @GetMapping("/artists/{id}")
  public ResponseEntity<ArtistResponse> getArtist(@PathVariable UUID id) {
    return ResponseEntity.ok(artistService.findById(id));
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

  @GetMapping("/tracks/{id}")
  public ResponseEntity<TrackResponse> getTrack(@PathVariable UUID id) {
    return ResponseEntity.ok(trackService.findById(id));
  }

  @GetMapping("/tracks")
  public ResponseEntity<List<TrackResponse>> listTracks(@RequestParam(required = false) UUID albumId) {
    List<TrackResponse> tracks = albumId != null
            ? trackService.findByAlbum(albumId)
            : trackService.findAll();
    return ResponseEntity.ok(tracks);
  }

  @GetMapping("/tracks/most-played")
  public ResponseEntity<List<TrackResponse>> mostPlayedTracks(
          @RequestParam(defaultValue = "10") int limit) {
    return ResponseEntity.ok(trackService.findMostPlayed(limit));
  }
}
