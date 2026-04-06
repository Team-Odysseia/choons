package dev.odysseia.choons.model.party;

import dev.odysseia.choons.model.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "party_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"party_id", "user_id"})
})
public class PartyMember {

  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(updatable = false, nullable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "party_id", nullable = false)
  private Party party;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(nullable = false)
  private boolean host;

  @Column(nullable = false)
  private boolean dj;

  @Column(nullable = false)
  private boolean connected;

  @CreationTimestamp
  @Column(updatable = false)
  private LocalDateTime joinedAt;
}
