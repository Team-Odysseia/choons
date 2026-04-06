package dev.odysseia.choons.model.party;

import dev.odysseia.choons.model.music.Track;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "party_playback_state")
public class PartyPlaybackState {

  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(updatable = false, nullable = false)
  private UUID id;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "party_id", nullable = false, unique = true)
  private Party party;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "track_id")
  private Track track;

  @Column(nullable = false)
  private boolean playing;

  @Column(nullable = false)
  private double anchorPositionSec;

  @Column(nullable = false)
  private long anchorEpochMs;

  @UpdateTimestamp
  private LocalDateTime updatedAt;
}
