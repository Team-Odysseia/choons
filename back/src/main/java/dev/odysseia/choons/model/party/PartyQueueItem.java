package dev.odysseia.choons.model.party;

import dev.odysseia.choons.model.music.Track;
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
@Table(name = "party_queue_items")
public class PartyQueueItem {

  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(updatable = false, nullable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "party_id", nullable = false)
  private Party party;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "track_id", nullable = false)
  private Track track;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "added_by_user_id", nullable = false)
  private User addedBy;

  @Column(nullable = false)
  private int position;

  @CreationTimestamp
  @Column(updatable = false)
  private LocalDateTime createdAt;
}
