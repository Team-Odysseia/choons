package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.*;
import dev.odysseia.choons.model.request.AlbumRequest;
import dev.odysseia.choons.model.request.AlbumRequestStatus;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.repository.AlbumRequestRepository;
import dev.odysseia.choons.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class AlbumRequestService {

  @Autowired private AlbumRequestRepository albumRequestRepository;
  @Autowired private UserRepository userRepository;

  public AlbumRequestResponse create(SubmitAlbumRequest request, User requester) {
    if (requester.isRequestsBlocked()) {
      throw new AccessDeniedException("Album requests are disabled for this user");
    }

    AlbumRequest saved = albumRequestRepository.save(AlbumRequest.builder()
            .albumName(request.albumName().trim())
            .artistName(request.artistName().trim())
            .externalUrl(request.externalUrl().trim())
            .status(AlbumRequestStatus.PENDING)
            .requester(requester)
            .build());
    return toResponse(saved);
  }

  public List<AlbumRequestResponse> findMine(User requester) {
    return albumRequestRepository.findByRequesterIdOrderByCreatedAtDesc(requester.getId()).stream()
            .map(this::toResponse)
            .toList();
  }

  public List<AlbumRequestResponse> findAll() {
    return albumRequestRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(this::toResponse)
            .toList();
  }

  @Transactional
  public AlbumRequestResponse updateStatus(UUID id, UpdateAlbumRequestStatusRequest request) {
    if (request.status() == AlbumRequestStatus.PENDING) {
      throw new IllegalArgumentException("Status can only be ACCEPTED or REJECTED");
    }

    AlbumRequest existing = albumRequestRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Album request not found: " + id));
    existing.setStatus(request.status());
    return toResponse(existing);
  }

  @Transactional
  public void deleteMine(UUID id, User requester) {
    AlbumRequest existing = albumRequestRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Album request not found: " + id));

    if (!existing.getRequester().getId().equals(requester.getId())) {
      throw new AccessDeniedException("Access denied");
    }
    if (existing.getStatus() != AlbumRequestStatus.PENDING) {
      throw new IllegalStateException("Only pending requests can be deleted");
    }

    albumRequestRepository.delete(existing);
  }

  @Transactional
  public ListenerRequestBanResponse setRequestBan(UUID userId, UpdateRequestBanRequest request) {
    User listener = userRepository.findById(userId)
            .orElseThrow(() -> new NoSuchElementException("User not found: " + userId));
    listener.setRequestsBlocked(request.blocked());
    userRepository.save(listener);
    return new ListenerRequestBanResponse(listener.getId(), listener.getUsername(), listener.isRequestsBlocked());
  }

  private AlbumRequestResponse toResponse(AlbumRequest request) {
    return new AlbumRequestResponse(
            request.getId(),
            request.getAlbumName(),
            request.getArtistName(),
            request.getExternalUrl(),
            request.getStatus(),
            request.getRequester().getId(),
            request.getRequester().getUsername(),
            request.getRequester().isRequestsBlocked(),
            request.getAdminNote(),
            request.getCreatedAt(),
            request.getUpdatedAt()
    );
  }
}
