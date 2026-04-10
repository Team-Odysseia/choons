package dev.odysseia.choons.config;

import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.UserRepository;
import dev.odysseia.choons.service.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifica que o RBAC está correto: quem pode acessar o quê.
 * Não testa lógica de negócio — só os códigos HTTP retornados pela camada de segurança.
 */
@SpringBootTest
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;

    private MockMvc mockMvc;
    private String adminToken;
    private String listenerToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        User admin = userRepository.save(User.builder()
                .username("sec_admin")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.ADMIN)
                .build());

        User listener = userRepository.save(User.builder()
                .username("sec_listener")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());

        adminToken = "Bearer " + jwtService.generateToken(admin);
        listenerToken = "Bearer " + jwtService.generateToken(listener);
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteAll();
    }

    // ─── /auth/login é pública ────────────────────────────────────────────────

    @Test
    void authLogin_isPublic() throws Exception {
        // POST sem token deve chegar ao endpoint (vai retornar 401 de credenciais, não de auth)
        mockMvc.perform(post("/auth/login")
                        .contentType("application/json")
                        .content("{\"username\":\"x\",\"password\":\"xxxxxx\"}"))
                .andExpect(status().isUnauthorized()); // credenciais inválidas, mas não 403
    }

    // ─── /admin/** — apenas ADMIN ─────────────────────────────────────────────

    @Test
    void admin_withAdminToken_isAllowed() throws Exception {
        mockMvc.perform(get("/admin/artists").header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void admin_withListenerToken_returns403() throws Exception {
        mockMvc.perform(get("/admin/artists").header("Authorization", listenerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/admin/artists"))
                .andExpect(status().isUnauthorized());
    }

    // ─── /music/** — qualquer autenticado ────────────────────────────────────

    @Test
    void music_withAdminToken_isAllowed() throws Exception {
        mockMvc.perform(get("/music/artists").header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void music_withListenerToken_isAllowed() throws Exception {
        mockMvc.perform(get("/music/artists").header("Authorization", listenerToken))
                .andExpect(status().isOk());
    }

    @Test
    void music_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/music/artists"))
                .andExpect(status().isUnauthorized());
    }

    // ─── /playlists/** — qualquer autenticado ────────────────────────────────

    @Test
    void playlists_withListenerToken_isAllowed() throws Exception {
        mockMvc.perform(get("/playlists").header("Authorization", listenerToken))
                .andExpect(status().isOk());
    }

    @Test
    void playlists_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/playlists"))
                .andExpect(status().isUnauthorized());
    }

    // ─── /album-requests/** — apenas LISTENER ─────────────────────────────────

    @Test
    void albumRequests_withListenerToken_isAllowed() throws Exception {
        mockMvc.perform(get("/album-requests/mine").header("Authorization", listenerToken))
                .andExpect(status().isOk());
    }

    @Test
    void albumRequests_withAdminToken_returns403() throws Exception {
        mockMvc.perform(get("/album-requests/mine").header("Authorization", adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void albumRequests_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/album-requests/mine"))
                .andExpect(status().isUnauthorized());
    }

    // ─── /admin/album-requests/** — apenas ADMIN ──────────────────────────────

    @Test
    void adminAlbumRequests_withAdminToken_isAllowed() throws Exception {
        mockMvc.perform(get("/admin/album-requests").header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void adminAlbumRequests_withListenerToken_returns403() throws Exception {
        mockMvc.perform(get("/admin/album-requests").header("Authorization", listenerToken))
                .andExpect(status().isForbidden());
    }

    // ─── /auth/me — qualquer autenticado ─────────────────────────────────────

    @Test
    void authMe_withListenerToken_isAllowed() throws Exception {
        mockMvc.perform(get("/auth/me").header("Authorization", listenerToken))
                .andExpect(status().isOk());
    }

    @Test
    void authMe_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    // ─── token expirado / inválido ────────────────────────────────────────────

    @Test
    void expiredToken_returns401() throws Exception {
        String expired = io.jsonwebtoken.Jwts.builder()
                .subject("00000000-0000-0000-0000-000000000000")
                .expiration(new java.util.Date(System.currentTimeMillis() - 1000))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                        "LYqyfJlfJhOiIzum61lUAdHAJVYzbdi8kxn9c1UiLcB"
                                .getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                .compact();

        mockMvc.perform(get("/music/artists").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tamperedToken_returns401() throws Exception {
        String validToken = adminToken.replace("Bearer ", "");
        String[] parts = validToken.split("\\.");
        String tampered = parts[0] + "." + parts[1] + ".invalidsignatureXXX";

        mockMvc.perform(get("/music/artists").header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listenerRoleElevation_cannotAccessAdmin() throws Exception {
        // Sanity: listener token cannot bypass /admin/** even with a valid JWT
        mockMvc.perform(post("/admin/artists")
                        .header("Authorization", listenerToken)
                        .contentType("application/json")
                        .content("{\"name\":\"Artist\",\"bio\":\"\"}"))
                .andExpect(status().isForbidden());
    }
}
