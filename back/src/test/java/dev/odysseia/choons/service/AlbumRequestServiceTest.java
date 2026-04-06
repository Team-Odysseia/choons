package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.SubmitAlbumRequest;
import dev.odysseia.choons.dto.UpdateAlbumRequestStatusRequest;
import dev.odysseia.choons.dto.UpdateRequestBanRequest;
import dev.odysseia.choons.model.request.AlbumRequest;
import dev.odysseia.choons.model.request.AlbumRequestStatus;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.AlbumRequestRepository;
import dev.odysseia.choons.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlbumRequestServiceTest {

    @Mock AlbumRequestRepository albumRequestRepository;
    @Mock UserRepository userRepository;
    @InjectMocks AlbumRequestService albumRequestService;

    private User listener;
    private User blockedListener;

    @BeforeEach
    void setUp() {
        listener = User.builder()
                .id(UUID.randomUUID())
                .username("listener")
                .role(UserRole.LISTENER)
                .requestsBlocked(false)
                .build();

        blockedListener = User.builder()
                .id(UUID.randomUUID())
                .username("blocked")
                .role(UserRole.LISTENER)
                .requestsBlocked(true)
                .build();
    }

    @Test
    void create_setsPendingStatusAndRequester() {
        when(albumRequestRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var response = albumRequestService.create(
                new SubmitAlbumRequest("  Dummy ", " Portishead ", " https://spotify.com/album/x "),
                listener
        );

        assertThat(response.status()).isEqualTo(AlbumRequestStatus.PENDING);
        assertThat(response.requesterId()).isEqualTo(listener.getId());
        assertThat(response.albumName()).isEqualTo("Dummy");
        assertThat(response.artistName()).isEqualTo("Portishead");
    }

    @Test
    void create_whenBlocked_throwsAccessDenied() {
        assertThatThrownBy(() -> albumRequestService.create(
                new SubmitAlbumRequest("Dummy", "Portishead", "https://spotify.com/album/x"),
                blockedListener
        )).isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("disabled");
    }

    @Test
    void findMine_returnsOnlyRequesterRequests() {
        AlbumRequest req = AlbumRequest.builder()
                .id(UUID.randomUUID())
                .albumName("Dummy")
                .artistName("Portishead")
                .externalUrl("https://spotify.com/album/x")
                .status(AlbumRequestStatus.PENDING)
                .requester(listener)
                .build();

        when(albumRequestRepository.findByRequesterIdOrderByCreatedAtDesc(listener.getId()))
                .thenReturn(List.of(req));

        var result = albumRequestService.findMine(listener);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).requesterId()).isEqualTo(listener.getId());
    }

    @Test
    void findAll_returnsCreatedAtDescOrderFromRepository() {
        AlbumRequest oldReq = AlbumRequest.builder()
                .id(UUID.randomUUID())
                .albumName("Old")
                .artistName("Old Artist")
                .externalUrl("https://spotify.com/album/old")
                .status(AlbumRequestStatus.PENDING)
                .requester(listener)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        AlbumRequest newReq = AlbumRequest.builder()
                .id(UUID.randomUUID())
                .albumName("New")
                .artistName("New Artist")
                .externalUrl("https://spotify.com/album/new")
                .status(AlbumRequestStatus.PENDING)
                .requester(listener)
                .createdAt(LocalDateTime.now())
                .build();

        when(albumRequestRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(newReq, oldReq));

        var result = albumRequestService.findAll();
        assertThat(result).extracting("albumName").containsExactly("New", "Old");
    }

    @Test
    void updateStatus_rejectsPendingTransition() {
        assertThatThrownBy(() -> albumRequestService.updateStatus(
                UUID.randomUUID(),
                new UpdateAlbumRequestStatusRequest(AlbumRequestStatus.PENDING)
        )).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deleteMine_deletesPendingRequest() {
        UUID id = UUID.randomUUID();
        AlbumRequest req = AlbumRequest.builder()
                .id(id)
                .albumName("Dummy")
                .artistName("Portishead")
                .externalUrl("https://spotify.com/album/x")
                .status(AlbumRequestStatus.PENDING)
                .requester(listener)
                .build();

        when(albumRequestRepository.findById(id)).thenReturn(Optional.of(req));

        albumRequestService.deleteMine(id, listener);
        verify(albumRequestRepository).delete(req);
    }

    @Test
    void deleteMine_whenNotOwner_throwsAccessDenied() {
        User other = User.builder().id(UUID.randomUUID()).username("other").role(UserRole.LISTENER).build();
        UUID id = UUID.randomUUID();
        AlbumRequest req = AlbumRequest.builder()
                .id(id)
                .albumName("Dummy")
                .artistName("Portishead")
                .externalUrl("https://spotify.com/album/x")
                .status(AlbumRequestStatus.PENDING)
                .requester(other)
                .build();

        when(albumRequestRepository.findById(id)).thenReturn(Optional.of(req));

        assertThatThrownBy(() -> albumRequestService.deleteMine(id, listener))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void deleteMine_whenNotPending_throwsConflict() {
        UUID id = UUID.randomUUID();
        AlbumRequest req = AlbumRequest.builder()
                .id(id)
                .albumName("Dummy")
                .artistName("Portishead")
                .externalUrl("https://spotify.com/album/x")
                .status(AlbumRequestStatus.ACCEPTED)
                .requester(listener)
                .build();

        when(albumRequestRepository.findById(id)).thenReturn(Optional.of(req));

        assertThatThrownBy(() -> albumRequestService.deleteMine(id, listener))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only pending requests can be deleted");
    }

    @Test
    void setRequestBan_updatesListenerFlag() {
        when(userRepository.findById(listener.getId())).thenReturn(Optional.of(listener));

        var response = albumRequestService.setRequestBan(listener.getId(), new UpdateRequestBanRequest(true));

        assertThat(response.requestsBlocked()).isTrue();
    }
}
