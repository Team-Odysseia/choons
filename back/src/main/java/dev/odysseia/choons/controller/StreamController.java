package dev.odysseia.choons.controller;

import dev.odysseia.choons.exception.RangeNotSatisfiableException;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.service.StreamTrackingService;
import dev.odysseia.choons.service.StreamingService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.UUID;
import java.io.IOException;

@RestController
@RequestMapping("/stream")
public class StreamController {

  private final StreamingService streamingService;
  private final StreamTrackingService streamTrackingService;

  public StreamController(StreamingService streamingService, StreamTrackingService streamTrackingService) {
    this.streamingService = streamingService;
    this.streamTrackingService = streamTrackingService;
  }

  @GetMapping("/{trackId}")
  public ResponseEntity<StreamingResponseBody> stream(
          @PathVariable UUID trackId,
          @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader) {
    StreamingService.StreamingResult result;
    try {
      result = streamingService.stream(trackId, rangeHeader);
    } catch (RangeNotSatisfiableException ex) {
      HttpHeaders headers = new HttpHeaders();
      headers.set(HttpHeaders.CONTENT_RANGE, "bytes */" + ex.getTotalSize());
      return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
              .headers(headers)
              .build();
    }

    StreamingResponseBody body = outputStream -> {
      try (var stream = result.stream()) {
        stream.transferTo(outputStream);
      } catch (IOException ignored) {
        // client disconnected mid-stream; nothing to do
      }
    };

    HttpHeaders headers = new HttpHeaders();
    headers.set(HttpHeaders.CONTENT_TYPE, result.contentType());
    headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
    headers.set(HttpHeaders.CONTENT_LENGTH, String.valueOf(result.contentLength()));

    if (result.isPartialContent()) {
      headers.set(HttpHeaders.CONTENT_RANGE,
              "bytes " + result.rangeStart() + "-" + result.rangeEnd() + "/" + result.totalSize());
      return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).headers(headers).body(body);
    }

    return ResponseEntity.ok().headers(headers).body(body);
  }

  @PostMapping("/{trackId}/played")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void recordPlay(@PathVariable UUID trackId, Authentication authentication) {
    User user = (User) authentication.getPrincipal();
    streamTrackingService.recordStream(trackId, user.getUsername());
  }
}
