package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.*;
import dev.odysseia.choons.model.music.Playlist;
import dev.odysseia.choons.model.music.PlaylistTrack;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.repository.PlaylistRepository;
import dev.odysseia.choons.repository.PlaylistTrackRepository;
import dev.odysseia.choons.repository.TrackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.AccessDeniedException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class PlaylistService {

  @Autowired private PlaylistRepository playlistRepository;
  @Autowired private PlaylistTrackRepository playlistTrackRepository;
  @Autowired private TrackRepository trackRepository;
  @Autowired private TrackService trackService;

  public PlaylistResponse create(CreatePlaylistRequest request, User owner) {
    Playlist playlist = playlistRepository.save(Playlist.builder()
            .name(request.name())
            .owner(owner)
            .build());
    return toResponse(playlist);
  }

  public List<PlaylistSummaryResponse> findByOwner(User owner) {
    return playlistRepository.findByOwnerIdOrderByUpdatedAtDesc(owner.getId()).stream()
            .map(p -> new PlaylistSummaryResponse(
                    p.getId(),
                    p.getName(),
                    playlistTrackRepository.countByPlaylistId(p.getId()),
                    p.isPublic(),
                    p.getUpdatedAt()))
            .toList();
  }

  public PlaylistResponse findById(UUID id, User user) throws AccessDeniedException {
    Playlist playlist = playlistRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Playlist not found: " + id));
    if (!playlist.getOwner().getId().equals(user.getId()) && !playlist.isPublic()) {
      throw new java.nio.file.AccessDeniedException("Not your playlist");
    }
    return toResponse(playlist);
  }

  public List<PlaylistSummaryResponse> findAllPublic(User excludeUser) {
    return playlistRepository.findByIsPublicTrueOrderByUpdatedAtDesc().stream()
            .filter(p -> !p.getOwner().getId().equals(excludeUser.getId()))
            .map(p -> new PlaylistSummaryResponse(
                    p.getId(),
                    p.getName(),
                    playlistTrackRepository.countByPlaylistId(p.getId()),
                    p.isPublic(),
                    p.getUpdatedAt()))
            .toList();
  }

  @Transactional
  public PlaylistResponse addTrack(UUID playlistId, AddTrackToPlaylistRequest request, User user)
          throws AccessDeniedException {
    Playlist playlist = getAndVerifyOwner(playlistId, user);
    Track track = trackRepository.findById(request.trackId())
            .orElseThrow(() -> new NoSuchElementException("Track not found: " + request.trackId()));

    int position = playlistTrackRepository.countByPlaylistId(playlistId);
    playlistTrackRepository.save(PlaylistTrack.builder()
            .playlist(playlist)
            .track(track)
            .position(position)
            .build());

    return toResponse(playlistRepository.findById(playlistId).orElseThrow());
  }

  @Transactional
  public PlaylistResponse removeTrack(UUID playlistId, UUID trackId, User user)
          throws AccessDeniedException {
    getAndVerifyOwner(playlistId, user);
    playlistTrackRepository.deleteByPlaylistIdAndTrackId(playlistId, trackId);
    reindexPositions(playlistId);
    return toResponse(playlistRepository.findById(playlistId).orElseThrow());
  }

  @Transactional
  public PlaylistResponse reorder(UUID playlistId, ReorderPlaylistRequest request, User user)
          throws AccessDeniedException {
    getAndVerifyOwner(playlistId, user);
    List<PlaylistTrack> entries = playlistTrackRepository.findByPlaylistIdOrderByPositionAsc(playlistId);

    for (int i = 0; i < request.orderedTrackIds().size(); i++) {
      UUID trackId = request.orderedTrackIds().get(i);
      final int pos = i;
      entries.stream()
              .filter(e -> e.getTrack().getId().equals(trackId))
              .findFirst()
              .ifPresent(e -> e.setPosition(pos));
    }
    playlistTrackRepository.saveAll(entries);
    return toResponse(playlistRepository.findById(playlistId).orElseThrow());
  }

  public PlaylistResponse setVisibility(UUID playlistId, boolean isPublic, User user)
          throws AccessDeniedException {
    Playlist playlist = getAndVerifyOwner(playlistId, user);
    playlist.setPublic(isPublic);
    playlistRepository.save(playlist);
    return toResponse(playlist);
  }

  @Transactional
  public void delete(UUID playlistId, User user) throws AccessDeniedException {
    getAndVerifyOwner(playlistId, user);
    playlistRepository.deleteById(playlistId);
  }

  private Playlist getAndVerifyOwner(UUID playlistId, User user) throws AccessDeniedException {
    Playlist playlist = playlistRepository.findById(playlistId)
            .orElseThrow(() -> new NoSuchElementException("Playlist not found: " + playlistId));
    if (!playlist.getOwner().getId().equals(user.getId())) {
      try {
        throw new AccessDeniedException("Not your playlist");
      } catch (AccessDeniedException e) {
        throw e;
      }
    }
    return playlist;
  }

  private void reindexPositions(UUID playlistId) {
    List<PlaylistTrack> entries = playlistTrackRepository.findByPlaylistIdOrderByPositionAsc(playlistId);
    for (int i = 0; i < entries.size(); i++) {
      entries.get(i).setPosition(i);
    }
    playlistTrackRepository.saveAll(entries);
  }

  private PlaylistResponse toResponse(Playlist playlist) {
    List<TrackResponse> tracks = playlistTrackRepository
            .findByPlaylistIdOrderByPositionAsc(playlist.getId()).stream()
            .map(pt -> trackService.toResponse(pt.getTrack()))
            .toList();
    return new PlaylistResponse(
            playlist.getId(),
            playlist.getName(),
            playlist.getOwner().getId(),
            tracks,
            playlist.isPublic(),
            playlist.getCreatedAt(),
            playlist.getUpdatedAt()
    );
  }
}
