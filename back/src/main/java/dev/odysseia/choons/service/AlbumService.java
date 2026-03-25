package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.AlbumResponse;
import dev.odysseia.choons.dto.CreateAlbumRequest;
import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class AlbumService {

  @Autowired private AlbumRepository albumRepository;
  @Autowired private ArtistRepository artistRepository;
  @Autowired private ArtistService artistService;

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
    return new AlbumResponse(
            album.getId(),
            album.getTitle(),
            artistService.toResponse(album.getArtist()),
            album.getReleaseYear(),
            album.getCreatedAt()
    );
  }
}
