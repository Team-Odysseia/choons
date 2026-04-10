package dev.odysseia.choons.filter;

import dev.odysseia.choons.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies rate limiting on /auth/login (per IP) and /stream/** (per IP).
 * Test profile sets both limits to 3 requests so tests can exhaust them cheaply.
 * Each test uses a unique X-Forwarded-For IP to avoid bucket state leaking between tests.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "rate-limit.login-capacity=3",
        "rate-limit.login-refill-per-minute=3",
        "rate-limit.stream-capacity=3",
        "rate-limit.stream-refill-per-minute=3"
})
class RateLimitFilterTest {

    private static final String LOGIN_PAYLOAD = "{\"username\":\"unknown\",\"password\":\"secret1\"}";

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteAll();
    }

    // ─── POST /auth/login ─────────────────────────────────────────────────────

    @Test
    void login_withinLimit_returns401NotRateLimited() throws Exception {
        String ip = "10.0.1.1";
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/auth/login")
                            .header("X-Forwarded-For", ip)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(LOGIN_PAYLOAD))
                    .andExpect(status().isUnauthorized()); // 401 — passed the rate limiter
        }
    }

    @Test
    void login_exceedingLimit_returns429() throws Exception {
        String ip = "10.0.1.2";
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/auth/login")
                    .header("X-Forwarded-For", ip)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(LOGIN_PAYLOAD));
        }
        mockMvc.perform(post("/auth/login")
                        .header("X-Forwarded-For", ip)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_PAYLOAD))
                .andExpect(status().is(429));
    }

    @Test
    void login_429_hasRetryAfterHeader() throws Exception {
        String ip = "10.0.1.3";
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/auth/login")
                    .header("X-Forwarded-For", ip)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(LOGIN_PAYLOAD));
        }
        mockMvc.perform(post("/auth/login")
                        .header("X-Forwarded-For", ip)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_PAYLOAD))
                .andExpect(status().is(429))
                .andExpect(header().string("Retry-After", "60"));
    }

    // ─── GET /stream/{id} ─────────────────────────────────────────────────────

    @Test
    void stream_withinLimit_returns401NotRateLimited() throws Exception {
        String ip = "10.0.2.1";
        UUID fakeId = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(get("/stream/{id}", fakeId)
                            .header("X-Forwarded-For", ip))
                    .andExpect(status().isUnauthorized()); // 401 — passed the rate limiter
        }
    }

    @Test
    void stream_exceedingLimit_returns429() throws Exception {
        String ip = "10.0.2.2";
        UUID fakeId = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(get("/stream/{id}", fakeId)
                    .header("X-Forwarded-For", ip));
        }
        mockMvc.perform(get("/stream/{id}", fakeId)
                        .header("X-Forwarded-For", ip))
                .andExpect(status().is(429));
    }

    // ─── Endpoints não limitados ──────────────────────────────────────────────

    @Test
    void otherEndpoints_notRateLimited() throws Exception {
        String ip = "10.0.3.1";
        // Well above either threshold — should never get 429
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/music/artists")
                            .header("X-Forwarded-For", ip))
                    .andExpect(status().isUnauthorized()); // 401, never 429
        }
    }

    // ─── IPs separados têm buckets independentes ──────────────────────────────

    @Test
    void login_differentIps_haveSeparateBuckets() throws Exception {
        String ip1 = "10.0.4.1";
        String ip2 = "10.0.4.2";

        // Exhaust ip1's bucket
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/auth/login")
                    .header("X-Forwarded-For", ip1)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(LOGIN_PAYLOAD));
        }

        // ip1 is rate limited
        mockMvc.perform(post("/auth/login")
                        .header("X-Forwarded-For", ip1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_PAYLOAD))
                .andExpect(status().is(429));

        // ip2 still has its own fresh bucket
        mockMvc.perform(post("/auth/login")
                        .header("X-Forwarded-For", ip2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_PAYLOAD))
                .andExpect(status().isUnauthorized()); // 401, not 429
    }
}
