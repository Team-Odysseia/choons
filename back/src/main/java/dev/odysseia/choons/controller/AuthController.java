package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.AuthResponse;
import dev.odysseia.choons.dto.LoginRequest;
import dev.odysseia.choons.dto.UserResponse;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.UserRepository;
import dev.odysseia.choons.service.JwtService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

  private static final int AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 3;

  private final AuthenticationManager authenticationManager;
  private final UserRepository userRepository;
  private final JwtService jwtService;
  private final PasswordEncoder passwordEncoder;

  public AuthController(AuthenticationManager authenticationManager,
                        UserRepository userRepository,
                        JwtService jwtService,
                        PasswordEncoder passwordEncoder) {
    this.authenticationManager = authenticationManager;
    this.userRepository = userRepository;
    this.jwtService = jwtService;
    this.passwordEncoder = passwordEncoder;
  }

  @Value("${auth.cookie.name:CHOONS_AUTH}")
  private String authCookieName;

  @Value("${auth.cookie.secure:true}")
  private boolean authCookieSecure;

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
    );
    User user = userRepository.findByUsername(request.username()).orElseThrow();
    String token = jwtService.generateToken(user);
    ResponseCookie cookie = authCookie(token, AUTH_COOKIE_MAX_AGE_SECONDS);
    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .body(new AuthResponse(token));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout() {
    ResponseCookie cookie = authCookie("", 0);
    return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .build();
  }

  private ResponseCookie authCookie(String value, int maxAgeSeconds) {
    return ResponseCookie.from(authCookieName, value)
            .httpOnly(true)
            .secure(authCookieSecure)
            .path("/")
            .sameSite(authCookieSecure ? "None" : "Lax")
            .maxAge(maxAgeSeconds)
            .build();
  }

  @PostMapping("/register")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<UserResponse> register(@Valid @RequestBody LoginRequest request) {
    String username = request.username().trim();
    if (userRepository.existsByUsername(username)) {
      throw new IllegalStateException("Username already exists");
    }

    User user = userRepository.save(User.builder()
            .username(username)
            .password(passwordEncoder.encode(request.password()))
            .role(UserRole.LISTENER)
            .build());
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(new UserResponse(user.getId(), user.getUsername(), user.getRole()));
  }

  @GetMapping("/me")
  public ResponseEntity<UserResponse> me(@AuthenticationPrincipal User user) {
    return ResponseEntity.ok(new UserResponse(user.getId(), user.getUsername(), user.getRole()));
  }
}
