package dev.odysseia.choons.controller;

import dev.odysseia.choons.model.request.AlbumRequest;
import dev.odysseia.choons.model.request.AlbumRequestStatus;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.AlbumRequestRepository;
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
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AlbumRequestControllerTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired AlbumRequestRepository albumRequestRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;
    @Autowired ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private User adminUser;
    private User listenerUser;
    private User otherListener;
    private User blockedListener;
    private String adminToken;
    private String listenerToken;
    private String otherListenerToken;
    private String blockedListenerToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        adminUser = userRepository.save(User.builder()
                .username("req_admin")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.ADMIN)
                .build());
        adminToken = "Bearer " + jwtService.generateToken(adminUser);

        listenerUser = userRepository.save(User.builder()
                .username("req_listener")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());
        listenerToken = "Bearer " + jwtService.generateToken(listenerUser);

        otherListener = userRepository.save(User.builder()
                .username("req_other")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());
        otherListenerToken = "Bearer " + jwtService.generateToken(otherListener);

        blockedListener = userRepository.save(User.builder()
                .username("req_blocked")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .requestsBlocked(true)
                .build());
        blockedListenerToken = "Bearer " + jwtService.generateToken(blockedListener);
    }

    @AfterEach
    void tearDown() {
        albumRequestRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void create_asListener_returns201AndPendingStatus() throws Exception {
        mockMvc.perform(post("/album-requests")
                        .header("Authorization", listenerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "albumName", "Dummy",
                                "artistName", "Portishead",
                                "externalUrl", "https://open.spotify.com/album/abc"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.albumName").value("Dummy"))
                .andExpect(jsonPath("$.artistName").value("Portishead"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.requesterUsername").value("req_listener"));
    }

    @Test
    void create_asAdmin_returns403() throws Exception {
        mockMvc.perform(post("/album-requests")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "albumName", "Discovery",
                                "artistName", "Daft Punk",
                                "externalUrl", "https://music.apple.com/album/id"
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    void create_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/album-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "albumName", "Dummy",
                                "artistName", "Portishead",
                                "externalUrl", "https://open.spotify.com/album/abc"
                        ))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_whenBlocked_returns403WithMessage() throws Exception {
        mockMvc.perform(post("/album-requests")
                        .header("Authorization", blockedListenerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "albumName", "Dummy",
                                "artistName", "Portishead",
                                "externalUrl", "https://open.spotify.com/album/abc"
                        ))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Album requests are disabled for this user"));
    }

    @Test
    void listMine_returnsOnlyOwnRequests() throws Exception {
        albumRequestRepository.save(AlbumRequest.builder()
                .albumName("Own Album")
                .artistName("Own Artist")
                .externalUrl("https://youtube.com/watch?v=own")
                .status(AlbumRequestStatus.PENDING)
                .requester(listenerUser)
                .build());

        albumRequestRepository.save(AlbumRequest.builder()
                .albumName("Other Album")
                .artistName("Other Artist")
                .externalUrl("https://youtube.com/watch?v=other")
                .status(AlbumRequestStatus.ACCEPTED)
                .requester(otherListener)
                .build());

        mockMvc.perform(get("/album-requests/mine")
                        .header("Authorization", listenerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].albumName").value("Own Album"))
                .andExpect(jsonPath("$[0].requesterUsername").value("req_listener"));
    }

    @Test
    void delete_ownPending_returns204() throws Exception {
        AlbumRequest saved = albumRequestRepository.save(AlbumRequest.builder()
                .albumName("Pending")
                .artistName("Artist")
                .externalUrl("https://youtube.com/watch?v=pending")
                .status(AlbumRequestStatus.PENDING)
                .requester(listenerUser)
                .build());

        mockMvc.perform(delete("/album-requests/{id}", saved.getId())
                        .header("Authorization", listenerToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_ownAccepted_returns409() throws Exception {
        AlbumRequest saved = albumRequestRepository.save(AlbumRequest.builder()
                .albumName("Accepted")
                .artistName("Artist")
                .externalUrl("https://youtube.com/watch?v=accepted")
                .status(AlbumRequestStatus.ACCEPTED)
                .requester(listenerUser)
                .build());

        mockMvc.perform(delete("/album-requests/{id}", saved.getId())
                        .header("Authorization", listenerToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Only pending requests can be deleted"));
    }

    @Test
    void delete_ownRejected_returns409() throws Exception {
        AlbumRequest saved = albumRequestRepository.save(AlbumRequest.builder()
                .albumName("Rejected")
                .artistName("Artist")
                .externalUrl("https://youtube.com/watch?v=rejected")
                .status(AlbumRequestStatus.REJECTED)
                .requester(listenerUser)
                .build());

        mockMvc.perform(delete("/album-requests/{id}", saved.getId())
                        .header("Authorization", listenerToken))
                .andExpect(status().isConflict());
    }

    @Test
    void delete_otherUserRequest_returns403() throws Exception {
        AlbumRequest saved = albumRequestRepository.save(AlbumRequest.builder()
                .albumName("Other")
                .artistName("Artist")
                .externalUrl("https://youtube.com/watch?v=other")
                .status(AlbumRequestStatus.PENDING)
                .requester(otherListener)
                .build());

        mockMvc.perform(delete("/album-requests/{id}", saved.getId())
                        .header("Authorization", listenerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminList_asAdmin_returnsRequestsWithRequester() throws Exception {
        albumRequestRepository.save(AlbumRequest.builder()
                .albumName("Admin View")
                .artistName("Artist")
                .externalUrl("https://spotify.com/album/view")
                .status(AlbumRequestStatus.PENDING)
                .requester(listenerUser)
                .build());

        mockMvc.perform(get("/admin/album-requests")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requesterId").value(listenerUser.getId().toString()))
                .andExpect(jsonPath("$[0].requesterUsername").value("req_listener"));
    }

    @Test
    void adminList_asListener_returns403() throws Exception {
        mockMvc.perform(get("/admin/album-requests")
                        .header("Authorization", listenerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateStatus_asAdmin_updatesRequestStatus() throws Exception {
        AlbumRequest saved = albumRequestRepository.save(AlbumRequest.builder()
                .albumName("Need Status")
                .artistName("Artist")
                .externalUrl("https://spotify.com/album/status")
                .status(AlbumRequestStatus.PENDING)
                .requester(listenerUser)
                .build());

        mockMvc.perform(put("/admin/album-requests/{id}/status", saved.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));
    }

    @Test
    void updateStatus_withInvalidStatus_returns400() throws Exception {
        AlbumRequest saved = albumRequestRepository.save(AlbumRequest.builder()
                .albumName("Need Status")
                .artistName("Artist")
                .externalUrl("https://spotify.com/album/status")
                .status(AlbumRequestStatus.PENDING)
                .requester(listenerUser)
                .build());

        mockMvc.perform(put("/admin/album-requests/{id}/status", saved.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PENDING\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void toggleRequestBan_asAdmin_blocksAndUnblocksListener() throws Exception {
        mockMvc.perform(put("/admin/listeners/{id}/request-ban", listenerUser.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("blocked", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(listenerUser.getId().toString()))
                .andExpect(jsonPath("$.requestsBlocked").value(true));

        mockMvc.perform(put("/admin/listeners/{id}/request-ban", listenerUser.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("blocked", false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestsBlocked").value(false));
    }

    @Test
    void toggleRequestBan_asListener_returns403() throws Exception {
        mockMvc.perform(put("/admin/listeners/{id}/request-ban", listenerUser.getId())
                        .header("Authorization", otherListenerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("blocked", true))))
                .andExpect(status().isForbidden());
    }

    @Test
    void create_withInvalidUrl_returns400() throws Exception {
        mockMvc.perform(post("/album-requests")
                        .header("Authorization", listenerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "albumName", "Dummy",
                                "artistName", "Portishead",
                                "externalUrl", "not-url"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void delete_unknownId_returns404() throws Exception {
        mockMvc.perform(delete("/album-requests/{id}", UUID.randomUUID())
                        .header("Authorization", listenerToken))
                .andExpect(status().isNotFound());
    }
}
