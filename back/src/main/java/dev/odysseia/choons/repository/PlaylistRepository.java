package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.music.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlaylistRepository extends JpaRepository<Playlist, UUID> {
  List<Playlist> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);
}
