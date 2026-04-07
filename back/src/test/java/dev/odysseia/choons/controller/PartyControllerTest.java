package dev.odysseia.choons.controller;

import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import dev.odysseia.choons.repository.PartyMemberRepository;
import dev.odysseia.choons.repository.PartyPlaybackStateRepository;
import dev.odysseia.choons.repository.PartyQueueItemRepository;
import dev.odysseia.choons.repository.PartyRepository;
import dev.odysseia.choons.repository.TrackRepository;
import dev.odysseia.choons.repository.UserRepository;
import dev.odysseia.choons.service.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class PartyControllerTest {

  @Autowired WebApplicationContext wac;
  @Autowired UserRepository userRepository;
  @Autowired ArtistRepository artistRepository;
  @Autowired AlbumRepository albumRepository;
  @Autowired TrackRepository trackRepository;
  @Autowired PartyRepository partyRepository;
  @Autowired PartyMemberRepository partyMemberRepository;
  @Autowired PartyQueueItemRepository partyQueueItemRepository;
  @Autowired PartyPlaybackStateRepository partyPlaybackStateRepository;
  @Autowired PasswordEncoder passwordEncoder;
  @Autowired JwtService jwtService;
  @Autowired ObjectMapper objectMapper;

  private MockMvc mockMvc;
  private String listenerToken;
  private Track track1;
  private Track track2;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders
            .webAppContextSetup(wac)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();

    User listener = userRepository.save(User.builder()
            .username("party_listener")
            .password(passwordEncoder.encode("pass"))
            .role(UserRole.LISTENER)
            .build());
    listenerToken = "Bearer " + jwtService.generateToken(listener);

    Artist artist = artistRepository.save(Artist.builder().name("Party Artist").bio("").build());
    Album album = albumRepository.save(Album.builder()
            .title("Party Album")
            .artist(artist)
            .releaseYear(2024)
            .build());

    track1 = trackRepository.save(Track.builder()
            .title("Track 1")
            .album(album)
            .artist(artist)
            .trackNumber(1)
            .durationSeconds(120)
            .r2Key("audio/1.mp3")
            .contentType("audio/mpeg")
            .build());

    track2 = trackRepository.save(Track.builder()
            .title("Track 2")
            .album(album)
            .artist(artist)
            .trackNumber(2)
            .durationSeconds(140)
            .r2Key("audio/2.mp3")
            .contentType("audio/mpeg")
            .build());
  }

  @AfterEach
  void tearDown() {
    partyPlaybackStateRepository.deleteAll();
    partyQueueItemRepository.deleteAll();
    partyMemberRepository.deleteAll();
    partyRepository.deleteAll();
    trackRepository.deleteAll();
    albumRepository.deleteAll();
    artistRepository.deleteAll();
    userRepository.deleteAll();
  }

  @Test
  void addQueueTracks_batchAddsTracksAndKeepsOrder() throws Exception {
    MvcResult createResult = mockMvc.perform(post("/parties")
                    .header("Authorization", listenerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                            "name", "My Party",
                            "queuePolicy", "EVERYONE"
                    ))))
            .andExpect(status().isCreated())
            .andReturn();

    String inviteCode = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("inviteCode").asText();

    mockMvc.perform(post("/parties/{inviteCode}/queue/batch", inviteCode)
                    .header("Authorization", listenerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                            "trackIds", new String[]{track1.getId().toString(), track2.getId().toString()}
                    ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.queue[0].track.id").value(track1.getId().toString()))
            .andExpect(jsonPath("$.queue[1].track.id").value(track2.getId().toString()))
            .andExpect(jsonPath("$.playback.track.id").value(track1.getId().toString()));
  }

  @Test
  void events_withoutAuth_returns401() throws Exception {
    mockMvc.perform(get("/parties/ABCDEFGH/events"))
            .andExpect(status().isUnauthorized());
  }
}
