package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.ArtistResponse;
import dev.odysseia.choons.mapper.ArtistMapper;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
  @Autowired private AlbumRepository albumRepository;
  @Autowired @Lazy private AlbumService albumService;
  @Autowired private R2Service r2Service;
  @Autowired private ArtistMapper artistMapper;

  public ArtistResponse create(String name, String bio, MultipartFile avatarFile) throws IOException {
    Artist artist = artistRepository.save(Artist.builder()
            .name(name)
            .bio(bio)
            .build());

    if (avatarFile != null && !avatarFile.isEmpty()) {
      String contentType = avatarFile.getContentType();
      if (contentType == null || !ALLOWED_IMAGE_TYPES.containsKey(contentType)) {
        throw new IllegalArgumentException("Unsupported image type: " + contentType);
      }
      String ext = ALLOWED_IMAGE_TYPES.get(contentType);
      String key = "images/artists/" + artist.getId() + "." + ext;
      r2Service.upload(key, avatarFile.getInputStream(), avatarFile.getSize(), contentType);
      artist.setAvatarKey(key);
      artist = artistRepository.save(artist);
    }

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

  @Transactional
  public void delete(UUID id) {
    Artist artist = artistRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Artist not found: " + id));
    albumRepository.findByArtistIdOrderByReleaseYearDesc(id)
            .forEach(album -> albumService.delete(album.getId()));
    if (artist.getAvatarKey() != null) {
      r2Service.delete(artist.getAvatarKey());
    }
    artistRepository.delete(artist);
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
    return artistMapper.toResponse(artist);
  }
}
