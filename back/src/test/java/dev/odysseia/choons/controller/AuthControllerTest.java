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
import jakarta.servlet.http.Cookie;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;
    @Autowired ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private User adminUser;
    private User listenerUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        adminUser = userRepository.save(User.builder()
                .username("admin")
                .password(passwordEncoder.encode("adminpass"))
                .role(UserRole.ADMIN)
                .build());

        listenerUser = userRepository.save(User.builder()
                .username("listener")
                .password(passwordEncoder.encode("listenerpass"))
                .role(UserRole.LISTENER)
                .build());
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteAll();
    }

    // ─── POST /auth/login ─────────────────────────────────────────────────────

    @Test
    void login_withValidCredentials_returns200AndDoesNotExposeTokenInBody() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "admin",
                                "password", "adminpass"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    void login_withValidCredentials_setsHttpOnlyCookie() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "admin",
                                "password", "adminpass"
                        ))))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("CHOONS_AUTH"))
                .andExpect(cookie().httpOnly("CHOONS_AUTH", true));
    }

    @Test
    void login_withWrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "admin",
                                "password", "wrongpass"
                        ))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_withNonExistentUser_returns401() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "ghost",
                                "password", "irrelevant"
                        ))))
                .andExpect(status().isUnauthorized());
    }

    // ─── POST /auth/register ──────────────────────────────────────────────────

    @Test
    void register_byAdmin_returns201WithNewUser() throws Exception {
        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(post("/auth/register")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "newlistener",
                                "password", "pass123"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("newlistener"))
                .andExpect(jsonPath("$.role").value("LISTENER"))
                .andExpect(jsonPath("$.id").isNotEmpty());
    }

    @Test
    void register_byListener_returns403() throws Exception {
        String token = jwtService.generateToken(listenerUser);

        mockMvc.perform(post("/auth/register")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "newuser",
                                "password", "pass123"
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    void register_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "newuser",
                                "password", "pass123"
                        ))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void register_withDuplicateUsername_returnsError() throws Exception {
        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(post("/auth/register")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "admin",
                                "password", "anotherpass"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Username already exists"));
    }

    // ─── GET /auth/me ─────────────────────────────────────────────────────────

    @Test
    void me_withValidAdminToken_returns200WithUserData() throws Exception {
        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.id").value(adminUser.getId().toString()));
    }

    @Test
    void me_withValidListenerToken_returnsListenerData() throws Exception {
        String token = jwtService.generateToken(listenerUser);

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("listener"))
                .andExpect(jsonPath("$.role").value("LISTENER"));
    }

    @Test
    void me_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_withInvalidToken_returns401() throws Exception {
        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer this.is.not.a.valid.jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_withValidAuthCookie_returns200() throws Exception {
        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(get("/auth/me")
                        .cookie(new Cookie("CHOONS_AUTH", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"));
    }

    @Test
    void logout_clearsAuthCookie() throws Exception {
        mockMvc.perform(post("/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().exists("CHOONS_AUTH"))
                .andExpect(cookie().value("CHOONS_AUTH", ""));
    }
}
