package dev.odysseia.choons.service;

import dev.odysseia.choons.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  @Autowired private JwtService jwtService;
  @Autowired private UserRepository userRepository;

  @Value("${auth.cookie.name:CHOONS_AUTH}")
  private String authCookieName;

  @Override
  protected void doFilterInternal(@NonNull HttpServletRequest request,
                                  @NonNull HttpServletResponse response,
                                  @NonNull FilterChain filterChain)
          throws ServletException, IOException {

    String jwt = extractToken(request);

    if (jwt == null) {
      filterChain.doFilter(request, response);
      return;
    }

    try {
      UUID userId = UUID.fromString(jwtService.extractUserId(jwt));

      if (SecurityContextHolder.getContext().getAuthentication() == null) {
        userRepository.findById(userId).ifPresent(user -> {
          if (jwtService.isTokenValid(jwt)) {
            List<SimpleGrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_" + user.getRole())
            );
            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(user, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authToken);
          }
        });
      }
    } catch (Exception ignored) {
      // Invalid token — continue without auth
    }

    filterChain.doFilter(request, response);
  }

  private String extractToken(HttpServletRequest request) {
    String authHeader = request.getHeader("Authorization");
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
      return null;
    }

    for (Cookie cookie : cookies) {
      if (authCookieName.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
        return cookie.getValue();
      }
    }

    return null;
  }
}
