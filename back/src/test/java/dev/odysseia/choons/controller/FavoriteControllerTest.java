package dev.odysseia.choons.controller;

import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class FavoriteControllerTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired ArtistRepository artistRepository;
    @Autowired AlbumRepository albumRepository;
    @Autowired TrackRepository trackRepository;
    @Autowired FavoriteRepository favoriteRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;

    private MockMvc mockMvc;
    private String token;
    private Track track;
    private Track otherTrack;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        User user = userRepository.save(User.builder()
                .username("fav_user")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());
        token = jwtService.generateToken(user);

        Artist artist = artistRepository.save(Artist.builder().name("Fav Artist").build());
        Album album = albumRepository.save(Album.builder()
                .title("Fav Album")
                .artist(artist)
                .releaseYear(2024)
                .build());

        track = trackRepository.save(Track.builder()
                .title("Fav Track")
                .album(album)
                .artist(artist)
                .trackNumber(1)
                .durationSeconds(180)
                .r2Key("audio/fav/1.mp3")
                .contentType("audio/mpeg")
                .build());

        otherTrack = trackRepository.save(Track.builder()
                .title("Other Track")
                .album(album)
                .artist(artist)
                .trackNumber(2)
                .durationSeconds(200)
                .r2Key("audio/fav/2.mp3")
                .contentType("audio/mpeg")
                .build());
    }

    @AfterEach
    void tearDown() {
        favoriteRepository.deleteAll();
        trackRepository.deleteAll();
        albumRepository.deleteAll();
        artistRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void addListCheckRemove_flowWorks() throws Exception {
        mockMvc.perform(post("/favorites/{trackId}", track.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(track.getId().toString()));

        mockMvc.perform(get("/favorites")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].track.id").value(track.getId().toString()));

        mockMvc.perform(get("/favorites/check")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("trackIds", track.getId().toString(), otherTrack.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value(track.getId().toString()));

        mockMvc.perform(delete("/favorites/{trackId}", track.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/favorites")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void favorites_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/favorites"))
                .andExpect(status().isUnauthorized());
    }
}
