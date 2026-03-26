package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.AlbumResponse;
import dev.odysseia.choons.dto.CreateAlbumRequest;
import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class AlbumService {

  private static final java.util.Map<String, String> ALLOWED_IMAGE_TYPES = java.util.Map.of(
          "image/jpeg", "jpg",
          "image/png", "png",
          "image/webp", "webp",
          "image/gif", "gif"
  );

  @Autowired private AlbumRepository albumRepository;
  @Autowired private ArtistRepository artistRepository;
  @Autowired private ArtistService artistService;
  @Autowired private R2Service r2Service;

  public AlbumResponse create(CreateAlbumRequest request) {
    Artist artist = artistRepository.findById(request.artistId())
            .orElseThrow(() -> new NoSuchElementException("Artist not found: " + request.artistId()));
    Album album = albumRepository.save(Album.builder()
            .title(request.title())
            .artist(artist)
            .releaseYear(request.releaseYear())
            .build());
    return toResponse(album);
  }

  public AlbumResponse update(UUID id, String title, UUID artistId, int releaseYear, MultipartFile coverFile) throws IOException {
    Album album = albumRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
    Artist artist = artistRepository.findById(artistId)
            .orElseThrow(() -> new NoSuchElementException("Artist not found: " + artistId));
    album.setTitle(title);
    album.setArtist(artist);
    album.setReleaseYear(releaseYear);

    if (coverFile != null && !coverFile.isEmpty()) {
      String contentType = coverFile.getContentType();
      if (contentType == null || !ALLOWED_IMAGE_TYPES.containsKey(contentType)) {
        throw new IllegalArgumentException("Unsupported image type: " + contentType);
      }
      if (album.getCoverKey() != null) {
        r2Service.delete(album.getCoverKey());
      }
      String ext = ALLOWED_IMAGE_TYPES.get(contentType);
      String key = "images/albums/" + id + "." + ext;
      r2Service.upload(key, coverFile.getInputStream(), coverFile.getSize(), contentType);
      album.setCoverKey(key);
    }

    return toResponse(albumRepository.save(album));
  }

  public void deleteCover(UUID id) {
    Album album = albumRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
    if (album.getCoverKey() != null) {
      r2Service.delete(album.getCoverKey());
      album.setCoverKey(null);
      albumRepository.save(album);
    }
  }

  public List<AlbumResponse> findAll() {
    return albumRepository.findAllByOrderByArtistNameAscTitleAsc().stream()
            .map(this::toResponse)
            .toList();
  }

  public List<AlbumResponse> findByArtist(UUID artistId) {
    return albumRepository.findByArtistIdOrderByReleaseYearDesc(artistId).stream()
            .map(this::toResponse)
            .toList();
  }

  public AlbumResponse findById(UUID id) {
    return albumRepository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
  }

  public AlbumResponse toResponse(Album album) {
    String coverUrl = album.getCoverKey() != null
            ? "/media/images/albums/" + album.getId()
            : null;
    return new AlbumResponse(
            album.getId(),
            album.getTitle(),
            artistService.toResponse(album.getArtist()),
            album.getReleaseYear(),
            album.getCreatedAt(),
            coverUrl
    );
  }
}
