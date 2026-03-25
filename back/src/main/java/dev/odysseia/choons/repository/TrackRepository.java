package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.music.Track;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TrackRepository extends JpaRepository<Track, UUID> {
  List<Track> findByAlbumIdOrderByTrackNumberAsc(UUID albumId);
  List<Track> findByArtistIdOrderByAlbumTitleAscTrackNumberAsc(UUID artistId);
}
