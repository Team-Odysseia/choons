package dev.odysseia.choons.model.request;

import dev.odysseia.choons.model.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "album_requests")
public class AlbumRequest {

  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(updatable = false, nullable = false)
  private UUID id;

  @Column(nullable = false, length = 160)
  private String albumName;

  @Column(nullable = false, length = 160)
  private String artistName;

  @Column(nullable = false, length = 600)
  private String externalUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private AlbumRequestStatus status;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "requester_id", nullable = false)
  private User requester;

  @Column(length = 600)
  private String adminNote;

  @CreationTimestamp
  @Column(updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  private LocalDateTime updatedAt;
}
