package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.TrackResponse;
import dev.odysseia.choons.model.music.Favorite;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.FavoriteRepository;
import dev.odysseia.choons.repository.TrackRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FavoriteServiceTest {

    @Mock FavoriteRepository favoriteRepository;
    @Mock TrackRepository trackRepository;
    @Mock TrackService trackService;
    @InjectMocks FavoriteService favoriteService;

    private User user;
    private Track track;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .username("listener")
                .role(UserRole.LISTENER)
                .build();

        track = Track.builder()
                .id(UUID.randomUUID())
                .title("Track")
                .r2Key("audio/test.mp3")
                .contentType("audio/mpeg")
                .build();
    }

    @Test
    void findByUser_returnsMappedFavorites() {
        Favorite favorite = Favorite.builder()
                .id(UUID.randomUUID())
                .user(user)
                .track(track)
                .favoritedAt(LocalDateTime.now())
                .build();

        TrackResponse trackResponse = new TrackResponse(
                track.getId(),
                track.getTitle(),
                null,
                null,
                1,
                180,
                LocalDateTime.now(),
                false,
                null
        );

        when(favoriteRepository.findByUserIdOrderByFavoritedAtDesc(user.getId())).thenReturn(List.of(favorite));
        when(trackService.toResponse(track)).thenReturn(trackResponse);

        var result = favoriteService.findByUser(user);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().track().id()).isEqualTo(track.getId());
    }

    @Test
    void addFavorite_savesWhenNotAlreadyFavorited() {
        when(trackRepository.findById(track.getId())).thenReturn(Optional.of(track));
        when(favoriteRepository.existsByUserIdAndTrackId(user.getId(), track.getId())).thenReturn(false);
        when(trackService.toResponse(track)).thenReturn(new TrackResponse(
                track.getId(), track.getTitle(), null, null, 1, 180, LocalDateTime.now(), false, null));

        favoriteService.addFavorite(track.getId(), user);

        verify(favoriteRepository).save(any(Favorite.class));
    }

    @Test
    void addFavorite_doesNotDuplicateExistingFavorite() {
        when(trackRepository.findById(track.getId())).thenReturn(Optional.of(track));
        when(favoriteRepository.existsByUserIdAndTrackId(user.getId(), track.getId())).thenReturn(true);
        when(trackService.toResponse(track)).thenReturn(new TrackResponse(
                track.getId(), track.getTitle(), null, null, 1, 180, LocalDateTime.now(), false, null));

        favoriteService.addFavorite(track.getId(), user);

        verify(favoriteRepository, never()).save(any(Favorite.class));
    }

    @Test
    void addFavorite_throwsWhenTrackMissing() {
        UUID missingTrackId = UUID.randomUUID();
        when(trackRepository.findById(missingTrackId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> favoriteService.addFavorite(missingTrackId, user))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void removeFavorite_deletesByUserAndTrack() {
        favoriteService.removeFavorite(track.getId(), user);

        verify(favoriteRepository).deleteByUserIdAndTrackId(user.getId(), track.getId());
    }

    @Test
    void checkFavorited_returnsOnlyFavoritedTrackIds() {
        Track secondTrack = Track.builder()
                .id(UUID.randomUUID())
                .title("Track 2")
                .r2Key("audio/test-2.mp3")
                .contentType("audio/mpeg")
                .build();

        Favorite favorite = Favorite.builder()
                .id(UUID.randomUUID())
                .user(user)
                .track(track)
                .favoritedAt(LocalDateTime.now())
                .build();

        when(favoriteRepository.findByUserIdAndTrackIdIn(user.getId(), List.of(track.getId(), secondTrack.getId())))
                .thenReturn(List.of(favorite));

        List<UUID> result = favoriteService.checkFavorited(List.of(track.getId(), secondTrack.getId()), user);

        assertThat(result).containsExactly(track.getId());
    }
}
