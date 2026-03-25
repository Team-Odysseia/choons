package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.music.PlaylistTrack;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlaylistTrackRepository extends JpaRepository<PlaylistTrack, UUID> {
  List<PlaylistTrack> findByPlaylistIdOrderByPositionAsc(UUID playlistId);
  Optional<PlaylistTrack> findByPlaylistIdAndTrackId(UUID playlistId, UUID trackId);
  void deleteByPlaylistIdAndTrackId(UUID playlistId, UUID trackId);
  int countByPlaylistId(UUID playlistId);
}
