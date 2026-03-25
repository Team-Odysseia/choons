package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.ArtistResponse;
import dev.odysseia.choons.dto.CreateArtistRequest;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.repository.ArtistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class ArtistService {

  @Autowired private ArtistRepository artistRepository;

  public ArtistResponse create(CreateArtistRequest request) {
    Artist artist = artistRepository.save(Artist.builder()
            .name(request.name())
            .bio(request.bio())
            .build());
    return toResponse(artist);
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
    return new ArtistResponse(artist.getId(), artist.getName(), artist.getBio(), artist.getCreatedAt());
  }
}
