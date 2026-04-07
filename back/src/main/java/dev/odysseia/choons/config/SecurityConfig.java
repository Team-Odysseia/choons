package dev.odysseia.choons.config;

import dev.odysseia.choons.filter.RateLimitFilter;
import dev.odysseia.choons.service.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpStatus;
import jakarta.servlet.DispatcherType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

  @Autowired private JwtAuthenticationFilter jwtAuthenticationFilter;
  @Autowired private RateLimitFilter rateLimitFilter;

  @Value("${cors.allowed-origins:http://localhost:5173}")
  private String corsAllowedOrigins;

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(rateLimitFilter, SecurityContextHolderFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                    .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                    .requestMatchers("/auth/login").permitAll()
                    .requestMatchers("/auth/logout").permitAll()
                    .requestMatchers("/public/**").permitAll()
                    .requestMatchers("/media/images/albums/**").permitAll()
                    .requestMatchers("/admin/**").hasRole("ADMIN")
                    .requestMatchers("/stream/**").authenticated()
                    .requestMatchers("/music/**").authenticated()
                    .requestMatchers("/playlists/**").authenticated()
                    .requestMatchers("/auth/**").authenticated()
                    .anyRequest().authenticated()
            );
    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    List<String> allowedOrigins = Arrays.stream(corsAllowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .toList();
    config.setAllowedOrigins(allowedOrigins);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  // Prevents Spring Boot from also registering RateLimitFilter in the main servlet chain.
  // It only runs inside the Spring Security filter chain (added via addFilterBefore above).
  @Bean
  public FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration() {
    FilterRegistrationBean<RateLimitFilter> reg = new FilterRegistrationBean<>(rateLimitFilter);
    reg.setEnabled(false);
    return reg;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
    return config.getAuthenticationManager();
  }
}
