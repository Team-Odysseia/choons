package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.request.AlbumRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AlbumRequestRepository extends JpaRepository<AlbumRequest, UUID> {
  List<AlbumRequest> findByRequesterIdOrderByCreatedAtDesc(UUID requesterId);

  List<AlbumRequest> findAllByOrderByCreatedAtDesc();
}
