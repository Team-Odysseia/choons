package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.music.Album;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AlbumRepository extends JpaRepository<Album, UUID> {
  List<Album> findByArtistIdOrderByReleaseYearDesc(UUID artistId);
  List<Album> findAllByOrderByArtistNameAscTitleAsc();
}
