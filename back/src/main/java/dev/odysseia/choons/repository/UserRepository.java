package dev.odysseia.choons.repository;

import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByUsername(String username);
  boolean existsByUsername(String username);
  List<User> findByRoleOrderByUsernameAsc(UserRole role);
  List<User> findByRoleAndUsernameContainingIgnoreCaseOrderByUsernameAsc(UserRole role, String username);
}
