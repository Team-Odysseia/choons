package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.music.Artist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ArtistRepository extends JpaRepository<Artist, UUID> {
  List<Artist> findAllByOrderByNameAsc();
}
