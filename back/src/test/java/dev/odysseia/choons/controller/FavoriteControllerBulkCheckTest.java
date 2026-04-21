package dev.odysseia.choons.controller;

import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.*;
import dev.odysseia.choons.service.JwtService;
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

import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class FavoriteControllerBulkCheckTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired JwtService jwtService;
    @Autowired PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;
    private String token;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        User user = userRepository.save(User.builder()
                .username("bulk_user_" + UUID.randomUUID())
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());
        token = jwtService.generateToken(user);
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        userRepository.deleteAll();
    }

    @Test
    void checkWith501TrackIds_returnsBadRequest() throws Exception {
        List<String> ids = IntStream.range(0, 501)
                .mapToObj(i -> UUID.randomUUID().toString())
                .toList();

        mockMvc.perform(get("/favorites/check")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("trackIds", ids.toArray(new String[0])))
                .andExpect(status().isBadRequest());
    }

    @Test
    void checkWith500TrackIds_returnsOk() throws Exception {
        List<String> ids = IntStream.range(0, 500)
                .mapToObj(i -> UUID.randomUUID().toString())
                .toList();

        mockMvc.perform(get("/favorites/check")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("trackIds", ids.toArray(new String[0])))
                .andExpect(status().isOk());
    }
}
