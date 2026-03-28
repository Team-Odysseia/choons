package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.music.StreamEvent;
import dev.odysseia.choons.model.music.Track;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface StreamEventRepository extends JpaRepository<StreamEvent, UUID> {

    @Query("SELECT e.track FROM StreamEvent e GROUP BY e.track ORDER BY COUNT(e) DESC")
    List<Track> findTopTracks(Pageable pageable);
}
