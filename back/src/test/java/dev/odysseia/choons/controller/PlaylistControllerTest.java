package dev.odysseia.choons.controller;

import tools.jackson.databind.ObjectMapper;
import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Playlist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.*;
import dev.odysseia.choons.service.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class PlaylistControllerTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired ArtistRepository artistRepository;
    @Autowired AlbumRepository albumRepository;
    @Autowired TrackRepository trackRepository;
    @Autowired PlaylistRepository playlistRepository;
    @Autowired PlaylistTrackRepository playlistTrackRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;

    @Autowired ObjectMapper mapper;

    private MockMvc mockMvc;
    private String ownerToken;
    private String otherToken;
    private User owner;
    private User other;
    private Artist artist;
    private Album album;
    private Track track;
    private Playlist playlist;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        owner = userRepository.save(User.builder()
                .username("pl_owner")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());
        ownerToken = jwtService.generateToken(owner);

        other = userRepository.save(User.builder()
                .username("pl_other")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());
        otherToken = jwtService.generateToken(other);

        artist = artistRepository.save(Artist.builder()
                .name("Test Artist")
                .build());
        album = albumRepository.save(Album.builder()
                .title("Test Album")
                .artist(artist)
                .releaseYear(2024)
                .build());
        track = trackRepository.save(Track.builder()
                .title("Test Track")
                .album(album)
                .artist(artist)
                .trackNumber(1)
                .durationSeconds(180)
                .r2Key("audio/test/track.mp3")
                .contentType("audio/mpeg")
                .build());

        playlist = playlistRepository.save(Playlist.builder()
                .name("My Playlist")
                .owner(owner)
                .build());
    }

    @AfterEach
    void tearDown() {
        playlistTrackRepository.deleteAll();
        playlistRepository.deleteAll();
        trackRepository.deleteAll();
        albumRepository.deleteAll();
        artistRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ─── setVisibility ────────────────────────────────────────────────────────

    @Test
    void setVisibility_ownerCanMakePlaylistPublic() throws Exception {
        mockMvc.perform(put("/playlists/{id}/visibility", playlist.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("isPublic", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPublic").value(true));
    }

    @Test
    void setVisibility_ownerCanMakePlaylistPrivate() throws Exception {
        // Make public first
        playlist.setPublic(true);
        playlistRepository.save(playlist);

        mockMvc.perform(put("/playlists/{id}/visibility", playlist.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("isPublic", false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPublic").value(false));
    }

    @Test
    void setVisibility_nonOwnerGetsForbidden() throws Exception {
        mockMvc.perform(put("/playlists/{id}/visibility", playlist.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("isPublic", true))))
                .andExpect(status().isForbidden());
    }

    @Test
    void setVisibility_unauthenticatedGetsUnauthorized() throws Exception {
        mockMvc.perform(put("/playlists/{id}/visibility", playlist.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("isPublic", true))))
                .andExpect(status().isUnauthorized());
    }

    // ─── listPublic ───────────────────────────────────────────────────────────

    @Test
    void listPublic_returnsOtherUsersPublicPlaylists() throws Exception {
        // owner's playlist is private (default) — should not appear
        // other user has a public playlist
        Playlist otherPublic = playlistRepository.save(Playlist.builder()
                .name("Other's Public")
                .owner(other)
                .isPublic(true)
                .build());

        mockMvc.perform(get("/playlists/public")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(otherPublic.getId().toString()))
                .andExpect(jsonPath("$[0].isPublic").value(true));
    }

    @Test
    void listPublic_excludesOwnPublicPlaylists() throws Exception {
        playlist.setPublic(true);
        playlistRepository.save(playlist);

        mockMvc.perform(get("/playlists/public")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void listPublic_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/playlists/public"))
                .andExpect(status().isUnauthorized());
    }

    // ─── getById (public access) ──────────────────────────────────────────────

    @Test
    void getById_nonOwnerCanReadPublicPlaylist() throws Exception {
        playlist.setPublic(true);
        playlistRepository.save(playlist);

        mockMvc.perform(get("/playlists/{id}", playlist.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(playlist.getId().toString()))
                .andExpect(jsonPath("$.isPublic").value(true));
    }

    @Test
    void getById_nonOwnerCannotReadPrivatePlaylist() throws Exception {
        mockMvc.perform(get("/playlists/{id}", playlist.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }
}
