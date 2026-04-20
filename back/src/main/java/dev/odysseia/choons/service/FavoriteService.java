package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.FavoriteTrackResponse;
import dev.odysseia.choons.dto.TrackResponse;
import dev.odysseia.choons.model.music.Favorite;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.repository.FavoriteRepository;
import dev.odysseia.choons.repository.TrackRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final TrackRepository trackRepository;
    private final TrackService trackService;

    public FavoriteService(FavoriteRepository favoriteRepository,
                           TrackRepository trackRepository,
                           TrackService trackService) {
        this.favoriteRepository = favoriteRepository;
        this.trackRepository = trackRepository;
        this.trackService = trackService;
    }

    public List<FavoriteTrackResponse> findByUser(User user) {
        return favoriteRepository.findByUserIdOrderByFavoritedAtDesc(user.getId()).stream()
                .map(fav -> new FavoriteTrackResponse(
                        trackService.toResponse(fav.getTrack()),
                        fav.getFavoritedAt()))
                .toList();
    }

    @Transactional
    public TrackResponse addFavorite(UUID trackId, User user) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new NoSuchElementException("Track not found: " + trackId));

        if (!favoriteRepository.existsByUserIdAndTrackId(user.getId(), trackId)) {
            favoriteRepository.save(Favorite.builder()
                    .user(user)
                    .track(track)
                    .build());
        }

        return trackService.toResponse(track);
    }

    @Transactional
    public void removeFavorite(UUID trackId, User user) {
        favoriteRepository.deleteByUserIdAndTrackId(user.getId(), trackId);
    }

    public boolean isFavorited(UUID trackId, User user) {
        return favoriteRepository.existsByUserIdAndTrackId(user.getId(), trackId);
    }

    public List<UUID> checkFavorited(List<UUID> trackIds, User user) {
        return favoriteRepository.findByUserIdAndTrackIdIn(user.getId(), trackIds).stream()
                .map(fav -> fav.getTrack().getId())
                .toList();
    }
}