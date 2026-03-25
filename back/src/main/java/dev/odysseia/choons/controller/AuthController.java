package dev.odysseia.choons.controller;

import dev.odysseia.choons.dto.AuthResponse;
import dev.odysseia.choons.dto.LoginRequest;
import dev.odysseia.choons.dto.UserResponse;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.UserRepository;
import dev.odysseia.choons.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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

  @Autowired private AuthenticationManager authenticationManager;
  @Autowired private UserRepository userRepository;
  @Autowired private JwtService jwtService;
  @Autowired private PasswordEncoder passwordEncoder;

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
    authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
    );
    User user = userRepository.findByUsername(request.username()).orElseThrow();
    String token = jwtService.generateToken(user);
    return ResponseEntity.ok(new AuthResponse(token));
  }

  @PostMapping("/register")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<UserResponse> register(@RequestBody LoginRequest request) {
    User user = userRepository.save(User.builder()
            .username(request.username())
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
