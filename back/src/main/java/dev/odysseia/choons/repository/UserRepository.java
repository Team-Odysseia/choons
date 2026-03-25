package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByUsername(String username);
  Optional<User> findById(UUID id);
  User save(User user);
}
