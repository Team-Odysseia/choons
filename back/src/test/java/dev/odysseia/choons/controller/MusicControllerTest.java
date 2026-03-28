package dev.odysseia.choons.controller;

import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.StreamEvent;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class MusicControllerTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired ArtistRepository artistRepository;
    @Autowired AlbumRepository albumRepository;
    @Autowired TrackRepository trackRepository;
    @Autowired StreamEventRepository streamEventRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;

    private MockMvc mockMvc;
    private String listenerToken;
    private User listener;
    private Artist artist;
    private Album album;
    private Track track1;
    private Track track2;
    private Track track3;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        listener = userRepository.save(User.builder()
                .username("music_listener")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());
        listenerToken = "Bearer " + jwtService.generateToken(listener);

        artist = artistRepository.save(Artist.builder().name("Test Artist").bio("").build());
        album = albumRepository.save(Album.builder()
                .title("Test Album").artist(artist).releaseYear(2024).build());

        track1 = trackRepository.save(Track.builder()
                .title("Track One").album(album).artist(artist)
                .trackNumber(1).durationSeconds(180)
                .r2Key("audio/test/track1.mp3").contentType("audio/mpeg").build());
        track2 = trackRepository.save(Track.builder()
                .title("Track Two").album(album).artist(artist)
                .trackNumber(2).durationSeconds(200)
                .r2Key("audio/test/track2.mp3").contentType("audio/mpeg").build());
        track3 = trackRepository.save(Track.builder()
                .title("Track Three").album(album).artist(artist)
                .trackNumber(3).durationSeconds(220)
                .r2Key("audio/test/track3.mp3").contentType("audio/mpeg").build());
    }

    @AfterEach
    void tearDown() {
        streamEventRepository.deleteAll();
        trackRepository.deleteAll();
        albumRepository.deleteAll();
        artistRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ─── GET /music/tracks/most-played ───────────────────────────────────────

    @Test
    void mostPlayed_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/music/tracks/most-played"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void mostPlayed_withNoPlays_returnsEmptyList() throws Exception {
        mockMvc.perform(get("/music/tracks/most-played")
                        .header(HttpHeaders.AUTHORIZATION, listenerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void mostPlayed_returnsTracksOrderedByPlayCount() throws Exception {
        // track1 → 3 plays, track3 → 2 plays, track2 → 1 play
        streamEventRepository.save(StreamEvent.builder().track(track1).user(listener).build());
        streamEventRepository.save(StreamEvent.builder().track(track1).user(listener).build());
        streamEventRepository.save(StreamEvent.builder().track(track1).user(listener).build());
        streamEventRepository.save(StreamEvent.builder().track(track3).user(listener).build());
        streamEventRepository.save(StreamEvent.builder().track(track3).user(listener).build());
        streamEventRepository.save(StreamEvent.builder().track(track2).user(listener).build());

        mockMvc.perform(get("/music/tracks/most-played")
                        .header(HttpHeaders.AUTHORIZATION, listenerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].title").value("Track One"))
                .andExpect(jsonPath("$[1].title").value("Track Three"))
                .andExpect(jsonPath("$[2].title").value("Track Two"));
    }

    @Test
    void mostPlayed_limitsResults() throws Exception {
        streamEventRepository.save(StreamEvent.builder().track(track1).user(listener).build());
        streamEventRepository.save(StreamEvent.builder().track(track2).user(listener).build());
        streamEventRepository.save(StreamEvent.builder().track(track3).user(listener).build());

        mockMvc.perform(get("/music/tracks/most-played")
                        .header(HttpHeaders.AUTHORIZATION, listenerToken)
                        .param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void mostPlayed_defaultLimitIsTen() throws Exception {
        // Create 12 distinct tracks and give each 1 play
        for (int i = 4; i <= 12; i++) {
            Track t = trackRepository.save(Track.builder()
                    .title("Extra Track " + i).album(album).artist(artist)
                    .trackNumber(i).durationSeconds(120)
                    .r2Key("audio/test/extra" + i + ".mp3").contentType("audio/mpeg").build());
            streamEventRepository.save(StreamEvent.builder().track(t).user(listener).build());
        }
        streamEventRepository.save(StreamEvent.builder().track(track1).user(listener).build());
        streamEventRepository.save(StreamEvent.builder().track(track2).user(listener).build());
        streamEventRepository.save(StreamEvent.builder().track(track3).user(listener).build());

        mockMvc.perform(get("/music/tracks/most-played")
                        .header(HttpHeaders.AUTHORIZATION, listenerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(10));
    }

    @Test
    void mostPlayed_responseContainsExpectedFields() throws Exception {
        streamEventRepository.save(StreamEvent.builder().track(track1).user(listener).build());

        mockMvc.perform(get("/music/tracks/most-played")
                        .header(HttpHeaders.AUTHORIZATION, listenerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").isNotEmpty())
                .andExpect(jsonPath("$[0].title").value("Track One"))
                .andExpect(jsonPath("$[0].artist.name").value("Test Artist"))
                .andExpect(jsonPath("$[0].album.title").value("Test Album"));
    }
}
