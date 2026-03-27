package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.UpdateTrackRequest;
import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.*;
import dev.odysseia.choons.service.JwtService;
import dev.odysseia.choons.service.R2Service;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AdminControllerTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired ArtistRepository artistRepository;
    @Autowired AlbumRepository albumRepository;
    @Autowired TrackRepository trackRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean R2Service r2Service;

    private MockMvc mockMvc;
    private String adminToken;
    private String listenerToken;
    private Artist artist;
    private Album album;
    private Track track;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        doNothing().when(r2Service).upload(any(), any(), anyLong(), any());
        doNothing().when(r2Service).delete(any());

        User admin = userRepository.save(User.builder()
                .username("admin_edit")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.ADMIN)
                .build());
        adminToken = "Bearer " + jwtService.generateToken(admin);

        User listener = userRepository.save(User.builder()
                .username("listener_edit")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());
        listenerToken = "Bearer " + jwtService.generateToken(listener);

        artist = artistRepository.save(Artist.builder()
                .name("Test Artist").bio("A bio").build());
        album = albumRepository.save(Album.builder()
                .title("Test Album").artist(artist).releaseYear(2024).build());
        track = trackRepository.save(Track.builder()
                .title("Track One").album(album).artist(artist)
                .trackNumber(1).durationSeconds(180)
                .r2Key("audio/test/track.mp3").contentType("audio/mpeg")
                .build());
    }

    @AfterEach
    void tearDown() {
        trackRepository.deleteAll();
        albumRepository.deleteAll();
        artistRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ─── POST /admin/artists ──────────────────────────────────────────────────

    @Test
    void createArtist_returnsCreatedWithNameAndNullAvatarUrl() throws Exception {
        mockMvc.perform(multipart("/admin/artists")
                        .param("name", "New Artist")
                        .param("bio", "Some bio")
                        .header("Authorization", adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("New Artist"))
                .andExpect(jsonPath("$.avatarUrl").isEmpty());
    }

    @Test
    void createArtist_withAvatar_returnsAvatarUrl() throws Exception {
        MockMultipartFile img = new MockMultipartFile(
                "avatarFile", "avatar.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/admin/artists")
                        .file(img)
                        .param("name", "Artist With Avatar")
                        .param("bio", "")
                        .header("Authorization", adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.avatarUrl").isNotEmpty());
    }

    // ─── POST /admin/albums ───────────────────────────────────────────────────

    @Test
    void createAlbum_returnsCreatedWithTitleAndNullCoverUrl() throws Exception {
        mockMvc.perform(multipart("/admin/albums")
                        .param("title", "New Album")
                        .param("artistId", artist.getId().toString())
                        .param("releaseYear", "2025")
                        .header("Authorization", adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("New Album"))
                .andExpect(jsonPath("$.coverUrl").isEmpty());
    }

    @Test
    void createAlbum_withCover_returnsCoverUrl() throws Exception {
        MockMultipartFile img = new MockMultipartFile(
                "coverFile", "cover.png", "image/png", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/admin/albums")
                        .file(img)
                        .param("title", "Album With Cover")
                        .param("artistId", artist.getId().toString())
                        .param("releaseYear", "2025")
                        .header("Authorization", adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.coverUrl").isNotEmpty());
    }

    // ─── Auth guard ───────────────────────────────────────────────────────────

    @Test
    void updateArtist_withoutAuth_returns401() throws Exception {
        mockMvc.perform(multipart("/admin/artists/{id}", artist.getId())
                        .param("name", "New Name")
                        .with(req -> { req.setMethod("PUT"); return req; }))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateArtist_asListener_returns403() throws Exception {
        mockMvc.perform(multipart("/admin/artists/{id}", artist.getId())
                        .param("name", "New Name")
                        .with(req -> { req.setMethod("PUT"); return req; })
                        .header("Authorization", listenerToken))
                .andExpect(status().isForbidden());
    }

    // ─── PUT /admin/artists/{id} ──────────────────────────────────────────────

    @Test
    void updateArtist_updatesNameAndBio() throws Exception {
        mockMvc.perform(multipart("/admin/artists/{id}", artist.getId())
                        .param("name", "Updated Name")
                        .param("bio", "Updated bio")
                        .with(req -> { req.setMethod("PUT"); return req; })
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"))
                .andExpect(jsonPath("$.bio").value("Updated bio"));
    }

    @Test
    void updateArtist_withAvatar_returnsAvatarUrl() throws Exception {
        MockMultipartFile img = new MockMultipartFile(
                "avatarFile", "avatar.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/admin/artists/{id}", artist.getId())
                        .file(img)
                        .param("name", "Test Artist")
                        .param("bio", "")
                        .with(req -> { req.setMethod("PUT"); return req; })
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value("/media/images/artists/" + artist.getId()));
    }

    @Test
    void updateArtist_withUnknownId_returns404() throws Exception {
        mockMvc.perform(multipart("/admin/artists/{id}", UUID.randomUUID())
                        .param("name", "X")
                        .with(req -> { req.setMethod("PUT"); return req; })
                        .header("Authorization", adminToken))
                .andExpect(status().isNotFound());
    }

    // ─── DELETE /admin/artists/{id}/avatar ───────────────────────────────────

    @Test
    void deleteArtistAvatar_withNoAvatar_returns204() throws Exception {
        mockMvc.perform(delete("/admin/artists/{id}/avatar", artist.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }

    // ─── PUT /admin/albums/{id} ───────────────────────────────────────────────

    @Test
    void updateAlbum_updatesFieldsAndReturnsOk() throws Exception {
        mockMvc.perform(multipart("/admin/albums/{id}", album.getId())
                        .param("title", "New Title")
                        .param("artistId", artist.getId().toString())
                        .param("releaseYear", "2023")
                        .with(req -> { req.setMethod("PUT"); return req; })
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New Title"))
                .andExpect(jsonPath("$.releaseYear").value(2023));
    }

    @Test
    void updateAlbum_withCover_returnsCoverUrl() throws Exception {
        MockMultipartFile img = new MockMultipartFile(
                "coverFile", "cover.png", "image/png", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/admin/albums/{id}", album.getId())
                        .file(img)
                        .param("title", "Test Album")
                        .param("artistId", artist.getId().toString())
                        .param("releaseYear", "2024")
                        .with(req -> { req.setMethod("PUT"); return req; })
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coverUrl").value("/media/images/albums/" + album.getId()));
    }

    @Test
    void updateAlbum_withUnknownId_returns404() throws Exception {
        mockMvc.perform(multipart("/admin/albums/{id}", UUID.randomUUID())
                        .param("title", "X")
                        .param("artistId", artist.getId().toString())
                        .param("releaseYear", "2024")
                        .with(req -> { req.setMethod("PUT"); return req; })
                        .header("Authorization", adminToken))
                .andExpect(status().isNotFound());
    }

    // ─── DELETE /admin/albums/{id}/cover ─────────────────────────────────────

    @Test
    void deleteAlbumCover_withNoCover_returns204() throws Exception {
        mockMvc.perform(delete("/admin/albums/{id}/cover", album.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }

    // ─── PUT /admin/albums/{albumId}/tracks ──────────────────────────────────

    @Test
    void updateAlbumTracks_updatesTrackTitlesAndOrder() throws Exception {
        List<UpdateTrackRequest> updates = List.of(
                new UpdateTrackRequest(track.getId(), "Renamed Track", 1));

        mockMvc.perform(put("/admin/albums/{albumId}/tracks", album.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updates)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Renamed Track"))
                .andExpect(jsonPath("$[0].trackNumber").value(1));
    }

    @Test
    void updateAlbumTracks_withTrackFromOtherAlbum_returns400() throws Exception {
        // Create a second album and track
        Album other = albumRepository.save(Album.builder()
                .title("Other Album").artist(artist).releaseYear(2020).build());
        Track otherTrack = trackRepository.save(Track.builder()
                .title("Other Track").album(other).artist(artist)
                .trackNumber(1).durationSeconds(120)
                .r2Key("audio/other.mp3").contentType("audio/mpeg")
                .build());

        List<UpdateTrackRequest> updates = List.of(
                new UpdateTrackRequest(otherTrack.getId(), "Moved", 1));

        mockMvc.perform(put("/admin/albums/{albumId}/tracks", album.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updates)))
                .andExpect(status().is4xxClientError());
    }

    // ─── DELETE /admin/tracks/{id} ────────────────────────────────────────────

    @Test
    void deleteTrack_returns204() throws Exception {
        mockMvc.perform(delete("/admin/tracks/{id}", track.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteTrack_withUnknownId_returns404() throws Exception {
        mockMvc.perform(delete("/admin/tracks/{id}", UUID.randomUUID())
                        .header("Authorization", adminToken))
                .andExpect(status().isNotFound());
    }

    // ─── DELETE /admin/artists/{id} ──────────────────────────────────────────

    @Test
    void deleteArtist_returns204AndRemovesArtist() throws Exception {
        mockMvc.perform(delete("/admin/artists/{id}", artist.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/admin/artists/{id}", artist.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteArtist_cascadesAlbumsAndTracks() throws Exception {
        UUID albumId = album.getId();
        UUID trackId = track.getId();

        mockMvc.perform(delete("/admin/artists/{id}", artist.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());

        assert albumRepository.findById(albumId).isEmpty();
        assert trackRepository.findById(trackId).isEmpty();
    }

    @Test
    void deleteArtist_withUnknownId_returns404() throws Exception {
        mockMvc.perform(delete("/admin/artists/{id}", UUID.randomUUID())
                        .header("Authorization", adminToken))
                .andExpect(status().isNotFound());
    }

    // ─── DELETE /admin/albums/{id} ────────────────────────────────────────────

    @Test
    void deleteAlbum_returns204AndRemovesAlbum() throws Exception {
        mockMvc.perform(delete("/admin/albums/{id}", album.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/admin/albums/{id}", album.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteAlbum_cascadesTracks() throws Exception {
        UUID trackId = track.getId();

        mockMvc.perform(delete("/admin/albums/{id}", album.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());

        assert trackRepository.findById(trackId).isEmpty();
    }

    @Test
    void deleteAlbum_withUnknownId_returns404() throws Exception {
        mockMvc.perform(delete("/admin/albums/{id}", UUID.randomUUID())
                        .header("Authorization", adminToken))
                .andExpect(status().isNotFound());
    }

    // ─── GET /admin/artists/{id} and /admin/albums/{id} ──────────────────────

    @Test
    void getArtist_returns200WithArtistData() throws Exception {
        mockMvc.perform(get("/admin/artists/{id}", artist.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Artist"))
                .andExpect(jsonPath("$.avatarUrl").isEmpty());
    }

    @Test
    void getAlbum_returns200WithAlbumData() throws Exception {
        mockMvc.perform(get("/admin/albums/{id}", album.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Album"))
                .andExpect(jsonPath("$.coverUrl").isEmpty());
    }
}
