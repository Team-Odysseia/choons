package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.*;
import dev.odysseia.choons.model.music.Playlist;
import dev.odysseia.choons.model.music.PlaylistTrack;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.PlaylistRepository;
import dev.odysseia.choons.repository.PlaylistTrackRepository;
import dev.odysseia.choons.repository.TrackRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.AccessDeniedException;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlaylistServiceTest {

    @Mock PlaylistRepository playlistRepository;
    @Mock PlaylistTrackRepository playlistTrackRepository;
    @Mock TrackRepository trackRepository;
    @Mock TrackService trackService;
    @InjectMocks PlaylistService playlistService;

    private User owner;
    private User otherUser;
    private Playlist playlist;
    private Track track;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(UUID.randomUUID())
                .username("owner")
                .role(UserRole.LISTENER)
                .build();

        otherUser = User.builder()
                .id(UUID.randomUUID())
                .username("other")
                .role(UserRole.LISTENER)
                .build();

        playlist = Playlist.builder()
                .id(UUID.randomUUID())
                .name("My Playlist")
                .owner(owner)
                .build();

        track = Track.builder()
                .id(UUID.randomUUID())
                .title("Track 1")
                .r2Key("audio/x/y/z.mp3")
                .contentType("audio/mpeg")
                .build();
    }

    // ─── create ───────────────────────────────────────────────────────────────

    @Test
    void create_savesPlaylistWithCorrectOwner() {
        when(playlistRepository.save(any())).thenReturn(playlist);
        when(playlistTrackRepository.findByPlaylistIdOrderByPositionAsc(playlist.getId()))
                .thenReturn(List.of());

        PlaylistResponse response = playlistService.create(new CreatePlaylistRequest("My Playlist"), owner);

        ArgumentCaptor<Playlist> captor = ArgumentCaptor.forClass(Playlist.class);
        verify(playlistRepository).save(captor.capture());
        assertThat(captor.getValue().getOwner()).isEqualTo(owner);
        assertThat(captor.getValue().getName()).isEqualTo("My Playlist");
        assertThat(response.name()).isEqualTo("My Playlist");
    }

    // ─── findByOwner ──────────────────────────────────────────────────────────

    @Test
    void findByOwner_returnsOnlyOwnersPlaylists() {
        when(playlistRepository.findByOwnerIdOrderByUpdatedAtDesc(owner.getId()))
                .thenReturn(List.of(playlist));
        when(playlistTrackRepository.countByPlaylistId(playlist.getId())).thenReturn(3);

        List<PlaylistSummaryResponse> result = playlistService.findByOwner(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(playlist.getId());
        assertThat(result.get(0).trackCount()).isEqualTo(3);
    }

    @Test
    void findByOwner_emptyListWhenNoPlaylists() {
        when(playlistRepository.findByOwnerIdOrderByUpdatedAtDesc(owner.getId()))
                .thenReturn(List.of());

        List<PlaylistSummaryResponse> result = playlistService.findByOwner(owner);

        assertThat(result).isEmpty();
    }

    // ─── findById ─────────────────────────────────────────────────────────────

    @Test
    void findById_returnsPlaylistForOwner() throws AccessDeniedException {
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));
        when(playlistTrackRepository.findByPlaylistIdOrderByPositionAsc(playlist.getId()))
                .thenReturn(List.of());

        PlaylistResponse response = playlistService.findById(playlist.getId(), owner);

        assertThat(response.id()).isEqualTo(playlist.getId());
    }

    @Test
    void findById_throwsAccessDeniedForWrongUser() {
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));

        assertThatThrownBy(() -> playlistService.findById(playlist.getId(), otherUser))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void findById_throwsNoSuchElementWhenNotFound() {
        UUID unknownId = UUID.randomUUID();
        when(playlistRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playlistService.findById(unknownId, owner))
                .isInstanceOf(NoSuchElementException.class);
    }

    // ─── addTrack ─────────────────────────────────────────────────────────────

    @Test
    void addTrack_savesPlaylistTrackAtNextPosition() throws AccessDeniedException {
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));
        when(trackRepository.findById(track.getId())).thenReturn(Optional.of(track));
        when(playlistTrackRepository.countByPlaylistId(playlist.getId())).thenReturn(2);
        when(playlistTrackRepository.findByPlaylistIdOrderByPositionAsc(playlist.getId()))
                .thenReturn(List.of());
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));

        playlistService.addTrack(playlist.getId(), new AddTrackToPlaylistRequest(track.getId()), owner);

        ArgumentCaptor<PlaylistTrack> captor = ArgumentCaptor.forClass(PlaylistTrack.class);
        verify(playlistTrackRepository).save(captor.capture());
        assertThat(captor.getValue().getPosition()).isEqualTo(2);
        assertThat(captor.getValue().getTrack()).isEqualTo(track);
        assertThat(captor.getValue().getPlaylist()).isEqualTo(playlist);
    }

    @Test
    void addTrack_throwsNoSuchElementForUnknownTrack() {
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));
        when(trackRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                playlistService.addTrack(playlist.getId(),
                        new AddTrackToPlaylistRequest(UUID.randomUUID()), owner))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void addTrack_throwsAccessDeniedForWrongUser() {
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));

        assertThatThrownBy(() ->
                playlistService.addTrack(playlist.getId(),
                        new AddTrackToPlaylistRequest(track.getId()), otherUser))
                .isInstanceOf(AccessDeniedException.class);
        verify(trackRepository, never()).findById(any());
    }

    // ─── removeTrack ──────────────────────────────────────────────────────────

    @Test
    void removeTrack_deletesEntryAndReindexes() throws AccessDeniedException {
        PlaylistTrack remaining = PlaylistTrack.builder()
                .id(UUID.randomUUID()).playlist(playlist).track(track).position(1).build();

        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));
        when(playlistTrackRepository.findByPlaylistIdOrderByPositionAsc(playlist.getId()))
                .thenReturn(new ArrayList<>(List.of(remaining)));
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));
        when(playlistTrackRepository.findByPlaylistIdOrderByPositionAsc(playlist.getId()))
                .thenReturn(new ArrayList<>(List.of(remaining)));

        playlistService.removeTrack(playlist.getId(), track.getId(), owner);

        verify(playlistTrackRepository).deleteByPlaylistIdAndTrackId(playlist.getId(), track.getId());
        // Reindex sets position 0 for the remaining track
        assertThat(remaining.getPosition()).isEqualTo(0);
        verify(playlistTrackRepository).saveAll(any());
    }

    @Test
    void removeTrack_throwsAccessDeniedForWrongUser() {
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));

        assertThatThrownBy(() ->
                playlistService.removeTrack(playlist.getId(), track.getId(), otherUser))
                .isInstanceOf(AccessDeniedException.class);
        verify(playlistTrackRepository, never()).deleteByPlaylistIdAndTrackId(any(), any());
    }

    // ─── reorder ──────────────────────────────────────────────────────────────

    @Test
    void reorder_updatesPositionsAccordingToNewOrder() throws AccessDeniedException {
        Track track2 = Track.builder().id(UUID.randomUUID()).title("Track 2")
                .r2Key("k").contentType("audio/mpeg").build();

        PlaylistTrack pt1 = PlaylistTrack.builder()
                .id(UUID.randomUUID()).playlist(playlist).track(track).position(0).build();
        PlaylistTrack pt2 = PlaylistTrack.builder()
                .id(UUID.randomUUID()).playlist(playlist).track(track2).position(1).build();

        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));
        when(playlistTrackRepository.findByPlaylistIdOrderByPositionAsc(playlist.getId()))
                .thenReturn(new ArrayList<>(List.of(pt1, pt2)));
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));
        when(playlistTrackRepository.findByPlaylistIdOrderByPositionAsc(playlist.getId()))
                .thenReturn(new ArrayList<>(List.of(pt1, pt2)));

        // Reverse the order
        playlistService.reorder(playlist.getId(),
                new ReorderPlaylistRequest(List.of(track2.getId(), track.getId())), owner);

        assertThat(pt2.getPosition()).isEqualTo(0);
        assertThat(pt1.getPosition()).isEqualTo(1);
        verify(playlistTrackRepository).saveAll(any());
    }

    @Test
    void reorder_throwsAccessDeniedForWrongUser() {
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));

        assertThatThrownBy(() ->
                playlistService.reorder(playlist.getId(),
                        new ReorderPlaylistRequest(List.of()), otherUser))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ─── delete ───────────────────────────────────────────────────────────────

    @Test
    void delete_removesPlaylistForOwner() throws AccessDeniedException {
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));

        playlistService.delete(playlist.getId(), owner);

        verify(playlistRepository).deleteById(playlist.getId());
    }

    @Test
    void delete_throwsAccessDeniedForWrongUser() {
        when(playlistRepository.findById(playlist.getId())).thenReturn(Optional.of(playlist));

        assertThatThrownBy(() -> playlistService.delete(playlist.getId(), otherUser))
                .isInstanceOf(AccessDeniedException.class);
        verify(playlistRepository, never()).deleteById(any());
    }
}
