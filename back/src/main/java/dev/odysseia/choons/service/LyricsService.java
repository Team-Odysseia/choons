package dev.odysseia.choons.service;

import dev.odysseia.choons.repository.TrackRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
public class LyricsService {

  private static final Logger log = LoggerFactory.getLogger(LyricsService.class);

  @Autowired private TrackRepository trackRepository;
  @Autowired private ObjectMapper objectMapper;

  private final HttpClient httpClient = HttpClient.newHttpClient();

  @Async
  @Transactional
  public void tryFetchAndSave(UUID trackId, String title, String artistName, String albumName, int durationSeconds) {
    try {
      String query = "track_name=" + URLEncoder.encode(title, StandardCharsets.UTF_8)
              + "&artist_name=" + URLEncoder.encode(artistName, StandardCharsets.UTF_8)
              + "&album_name=" + URLEncoder.encode(albumName, StandardCharsets.UTF_8)
              + "&duration=" + durationSeconds;

      HttpRequest request = HttpRequest.newBuilder()
              .uri(URI.create("https://lrclib.net/api/get?" + query))
              .GET()
              .header("User-Agent", "Choons/1.0 (self-hosted music server)")
              .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() == 200) {
        LrclibResponse result = objectMapper.readValue(response.body(), LrclibResponse.class);
        if (result.id() != null) {
          trackRepository.findById(trackId).ifPresent(track -> {
            track.setLrclibId(result.id());
            trackRepository.save(track);
            log.info("Auto-matched lrclib ID {} for track '{}'", result.id(), title);
          });
        }
      }
    } catch (Exception e) {
      log.warn("Could not auto-fetch lyrics for track '{}': {}", title, e.getMessage());
    }
  }

  private record LrclibResponse(Integer id) {}
}
