package dev.odysseia.choons.controller;

import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import dev.odysseia.choons.service.R2Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/media/images")
public class MediaController {

  @Autowired private ArtistRepository artistRepository;
  @Autowired private AlbumRepository albumRepository;
  @Autowired private R2Service r2Service;

  @GetMapping("/artists/{id}")
  public ResponseEntity<InputStreamResource> serveArtistImage(@PathVariable UUID id) {
    Artist artist = artistRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Artist not found: " + id));
    if (artist.getAvatarKey() == null) {
      return ResponseEntity.notFound().build();
    }
    return streamImage(r2Service.getObjectStream(artist.getAvatarKey(), null, null));
  }

  @GetMapping("/albums/{id}")
  public ResponseEntity<InputStreamResource> serveAlbumImage(@PathVariable UUID id) {
    Album album = albumRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
    if (album.getCoverKey() == null) {
      return ResponseEntity.notFound().build();
    }
    return streamImage(r2Service.getObjectStream(album.getCoverKey(), null, null));
  }

  private ResponseEntity<InputStreamResource> streamImage(
          ResponseInputStream<GetObjectResponse> stream) {
    String contentType = stream.response().contentType();
    long contentLength = stream.response().contentLength();
    return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
            .contentLength(contentLength)
            .body(new InputStreamResource(stream));
  }
}
