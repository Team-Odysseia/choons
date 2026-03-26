package dev.odysseia.choons.service;

import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class JwtServiceTest {

    private static final String SECRET = "LYqyfJlfJhOiIzum61lUAdHAJVYzbdi8kxn9c1UiLcB";

    private JwtService jwtService;
    private User adminUser;
    private User listenerUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", SECRET);

        adminUser = User.builder()
                .id(UUID.randomUUID())
                .username("admin")
                .password("hashed")
                .role(UserRole.ADMIN)
                .build();

        listenerUser = User.builder()
                .id(UUID.randomUUID())
                .username("listener")
                .password("hashed")
                .role(UserRole.LISTENER)
                .build();
    }

    // ─── generateToken ────────────────────────────────────────────────────────

    @Test
    void generateToken_returnsNonBlankString() {
        String token = jwtService.generateToken(adminUser);
        assertThat(token).isNotBlank();
    }

    @Test
    void generateToken_subjectIsUserId() {
        String token = jwtService.generateToken(adminUser);
        String subject = jwtService.extractUserId(token);
        assertThat(subject).isEqualTo(adminUser.getId().toString());
    }

    @Test
    void generateToken_containsRoleClaim() {
        String token = jwtService.generateToken(adminUser);
        String role = jwtService.extractClaim(token, c -> c.get("role", String.class));
        assertThat(role).isEqualTo("ADMIN");
    }

    @Test
    void generateToken_expiresInApproximately3Days() {
        String token = jwtService.generateToken(adminUser);
        Date expiration = jwtService.extractExpiration(token);

        long threeDaysMs = 86400000L * 3;
        long now = System.currentTimeMillis();
        // JWT timestamps have second-level precision, allow ±2s tolerance
        assertThat(expiration.getTime())
                .isGreaterThan(now + threeDaysMs - 2_000)
                .isLessThan(now + threeDaysMs + 2_000);
    }

    @Test
    void generateToken_differentUsersProduceDifferentTokens() {
        String tokenA = jwtService.generateToken(adminUser);
        String tokenB = jwtService.generateToken(listenerUser);
        assertThat(tokenA).isNotEqualTo(tokenB);
    }

    // ─── isTokenValid ─────────────────────────────────────────────────────────

    @Test
    void isTokenValid_freshTokenReturnsTrue() {
        String token = jwtService.generateToken(adminUser);
        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    void isTokenValid_expiredTokenThrowsException() {
        // Build a token that expired 1 second ago
        String expiredToken = io.jsonwebtoken.Jwts.builder()
                .subject(adminUser.getId().toString())
                .issuedAt(new Date(System.currentTimeMillis() - 10_000))
                .expiration(new Date(System.currentTimeMillis() - 1_000))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                        SECRET.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                .compact();

        assertThatThrownBy(() -> jwtService.isTokenValid(expiredToken))
                .isInstanceOf(ExpiredJwtException.class);
    }

    // ─── extractUserId ────────────────────────────────────────────────────────

    @Test
    void extractUserId_returnsCorrectId() {
        String token = jwtService.generateToken(listenerUser);
        assertThat(jwtService.extractUserId(token))
                .isEqualTo(listenerUser.getId().toString());
    }

    @Test
    void extractUserId_withTamperedSignature_throwsSignatureException() {
        String token = jwtService.generateToken(adminUser);
        // Replace the signature part with garbage
        String[] parts = token.split("\\.");
        String tampered = parts[0] + "." + parts[1] + ".invalidsignatureXXX";

        assertThatThrownBy(() -> jwtService.extractUserId(tampered))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    void extractUserId_withMalformedToken_throwsMalformedJwtException() {
        assertThatThrownBy(() -> jwtService.extractUserId("not.a.jwt.token.at.all"))
                .isInstanceOf(MalformedJwtException.class);
    }

    // ─── extractClaim ─────────────────────────────────────────────────────────

    @Test
    void extractClaim_issuedAtIsBeforeExpiration() {
        String token = jwtService.generateToken(adminUser);
        Date issuedAt = jwtService.extractClaim(token, Claims::getIssuedAt);
        Date expiration = jwtService.extractExpiration(token);
        assertThat(issuedAt).isBefore(expiration);
    }
}
