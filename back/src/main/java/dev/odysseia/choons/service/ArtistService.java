package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.ArtistResponse;
import dev.odysseia.choons.dto.CreateArtistRequest;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.repository.ArtistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class ArtistService {

  private static final java.util.Map<String, String> ALLOWED_IMAGE_TYPES = java.util.Map.of(
          "image/jpeg", "jpg",
          "image/png", "png",
          "image/webp", "webp",
          "image/gif", "gif"
  );

  @Autowired private ArtistRepository artistRepository;
  @Autowired private R2Service r2Service;

  public ArtistResponse create(CreateArtistRequest request) {
    Artist artist = artistRepository.save(Artist.builder()
            .name(request.name())
            .bio(request.bio())
            .build());
    return toResponse(artist);
  }

  public ArtistResponse update(UUID id, String name, String bio, MultipartFile avatarFile) throws IOException {
    Artist artist = artistRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Artist not found: " + id));
    artist.setName(name);
    artist.setBio(bio);

    if (avatarFile != null && !avatarFile.isEmpty()) {
      String contentType = avatarFile.getContentType();
      if (contentType == null || !ALLOWED_IMAGE_TYPES.containsKey(contentType)) {
        throw new IllegalArgumentException("Unsupported image type: " + contentType);
      }
      if (artist.getAvatarKey() != null) {
        r2Service.delete(artist.getAvatarKey());
      }
      String ext = ALLOWED_IMAGE_TYPES.get(contentType);
      String key = "images/artists/" + id + "." + ext;
      r2Service.upload(key, avatarFile.getInputStream(), avatarFile.getSize(), contentType);
      artist.setAvatarKey(key);
    }

    return toResponse(artistRepository.save(artist));
  }

  public void deleteAvatar(UUID id) {
    Artist artist = artistRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Artist not found: " + id));
    if (artist.getAvatarKey() != null) {
      r2Service.delete(artist.getAvatarKey());
      artist.setAvatarKey(null);
      artistRepository.save(artist);
    }
  }

  public List<ArtistResponse> findAll() {
    return artistRepository.findAllByOrderByNameAsc().stream()
            .map(this::toResponse)
            .toList();
  }

  public ArtistResponse findById(UUID id) {
    return artistRepository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new NoSuchElementException("Artist not found: " + id));
  }

  public ArtistResponse toResponse(Artist artist) {
    String avatarUrl = artist.getAvatarKey() != null
            ? "/media/images/artists/" + artist.getId()
            : null;
    return new ArtistResponse(artist.getId(), artist.getName(), artist.getBio(), artist.getCreatedAt(), avatarUrl);
  }
}
