package dev.odysseia.choons.controller;

import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AdminControllerValidationTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;
    @Autowired ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private String adminToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        User admin = userRepository.save(User.builder()
                .username("val_admin")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.ADMIN)
                .build());
        adminToken = "Bearer " + jwtService.generateToken(admin);
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteAll();
    }

    @Test
    void updateListener_withNullUsername_returns400() throws Exception {
        User listener = userRepository.save(User.builder()
                .username("val_listener")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());

        mockMvc.perform(put("/admin/listeners/{id}", listener.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateTrack_withBlankTitle_returns400() throws Exception {
        mockMvc.perform(put("/admin/tracks/{id}", "00000000-0000-0000-0000-000000000000")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"trackNumber\":1}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateTrackLrclibId_withNullLrclibId_returns404() throws Exception {
        // Null lrclibId is allowed (to clear the value), but track does not exist so 404
        mockMvc.perform(put("/admin/tracks/{id}/lrclib-id", "00000000-0000-0000-0000-000000000000")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());
    }
}
