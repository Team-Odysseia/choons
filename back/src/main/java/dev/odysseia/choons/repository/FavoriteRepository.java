package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.music.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {
    List<Favorite> findByUserIdOrderByFavoritedAtDesc(UUID userId);
    boolean existsByUserIdAndTrackId(UUID userId, UUID trackId);
    void deleteByUserIdAndTrackId(UUID userId, UUID trackId);
    long countByUserId(UUID userId);
    List<Favorite> findByUserIdAndTrackIdIn(UUID userId, List<UUID> trackIds);
}