package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.AlbumResponse;
import dev.odysseia.choons.mapper.AlbumMapper;
import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import dev.odysseia.choons.repository.PlaylistTrackRepository;
import dev.odysseia.choons.repository.TrackRepository;
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
  @Autowired private TrackRepository trackRepository;
  @Autowired private PlaylistTrackRepository playlistTrackRepository;
  @Autowired private R2Service r2Service;
  @Autowired private AlbumMapper albumMapper;

  public AlbumResponse create(String title, UUID artistId, int releaseYear, MultipartFile coverFile) throws IOException {
    Artist artist = artistRepository.findById(artistId)
            .orElseThrow(() -> new NoSuchElementException("Artist not found: " + artistId));
    Album album = albumRepository.save(Album.builder()
            .title(title)
            .artist(artist)
            .releaseYear(releaseYear)
            .build());

    if (coverFile != null && !coverFile.isEmpty()) {
      String contentType = coverFile.getContentType();
      if (contentType == null || !ALLOWED_IMAGE_TYPES.containsKey(contentType)) {
        throw new IllegalArgumentException("Unsupported image type: " + contentType);
      }
      String ext = ALLOWED_IMAGE_TYPES.get(contentType);
      String key = "images/albums/" + album.getId() + "." + ext;
      r2Service.upload(key, coverFile.getInputStream(), coverFile.getSize(), contentType);
      album.setCoverKey(key);
      album = albumRepository.save(album);
    }

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

  @org.springframework.transaction.annotation.Transactional
  public void delete(UUID id) {
    Album album = albumRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
    List<Track> tracks = trackRepository.findByAlbumIdOrderByTrackNumberAsc(id);
    if (!tracks.isEmpty()) {
      List<UUID> trackIds = tracks.stream().map(Track::getId).toList();
      playlistTrackRepository.deleteByTrackIdIn(trackIds);
      for (Track track : tracks) {
        if (track.getR2Key() != null && !track.getR2Key().equals("pending")) {
          r2Service.delete(track.getR2Key());
        }
      }
      trackRepository.deleteAll(tracks);
    }
    if (album.getCoverKey() != null) {
      r2Service.delete(album.getCoverKey());
    }
    albumRepository.delete(album);
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

  public List<AlbumResponse> search(UUID artistId, String query) {
    String normalized = query == null ? "" : query.trim().toLowerCase();
    List<AlbumResponse> source = artistId != null ? findByArtist(artistId) : findAll();
    if (normalized.isBlank()) {
      return source;
    }
    return source.stream()
            .filter(album -> album.title().toLowerCase().contains(normalized)
                    || album.artist().name().toLowerCase().contains(normalized))
            .toList();
  }

  public AlbumResponse findById(UUID id) {
    return albumRepository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
  }

  public AlbumResponse toResponse(Album album) {
    return albumMapper.toResponse(album);
  }
}
