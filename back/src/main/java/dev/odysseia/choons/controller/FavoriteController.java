package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.FavoriteTrackResponse;
import dev.odysseia.choons.dto.TrackResponse;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.service.FavoriteService;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/favorites")
@Validated
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @GetMapping
    public ResponseEntity<List<FavoriteTrackResponse>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.findByUser(user));
    }

    @PostMapping("/{trackId}")
    public ResponseEntity<TrackResponse> add(@PathVariable UUID trackId,
                                              @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(favoriteService.addFavorite(trackId, user));
    }

    @DeleteMapping("/{trackId}")
    public ResponseEntity<Void> remove(@PathVariable UUID trackId,
                                       @AuthenticationPrincipal User user) {
        favoriteService.removeFavorite(trackId, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/check")
    public ResponseEntity<List<UUID>> check(@RequestParam @Size(max = 500) List<UUID> trackIds,
                                            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.checkFavorited(trackIds, user));
    }
}