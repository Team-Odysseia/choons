package dev.odysseia.choons.model.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(name = "id", updatable = false, nullable = false)
  private UUID id;

  @Column(unique = true)
  private String username;

  @JsonIgnore
  private String password;

  @Enumerated(EnumType.STRING)
  private UserRole role;

  @Builder.Default
  @Column(name = "requests_blocked", nullable = false)
  private boolean requestsBlocked = false;
}
