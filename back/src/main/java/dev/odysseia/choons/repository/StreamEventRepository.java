package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.music.StreamEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StreamEventRepository extends JpaRepository<StreamEvent, UUID> {}
