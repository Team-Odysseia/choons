package dev.odysseia.choons.service;

import dev.odysseia.choons.exception.RangeNotSatisfiableException;
import dev.odysseia.choons.model.music.Track;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.UUID;

@Service
public class StreamingService {

  private final TrackService trackService;
  private final R2Service r2Service;

  public StreamingService(TrackService trackService, R2Service r2Service) {
    this.trackService = trackService;
    this.r2Service = r2Service;
  }

  public record StreamingResult(
          ResponseInputStream<GetObjectResponse> stream,
          String contentType,
          long contentLength,
          long totalSize,
          long rangeStart,
          long rangeEnd,
          boolean isPartialContent
  ) {}

  public StreamingResult stream(UUID trackId, String rangeHeader) {
    Track track = trackService.getTrackEntity(trackId);
    String key = track.getR2Key();
    String contentType = track.getContentType();

    long totalSize = r2Service.getObjectSize(key);

    if (rangeHeader == null || !rangeHeader.startsWith("bytes=")) {
      ResponseInputStream<GetObjectResponse> stream = r2Service.getObjectStream(key, null, null);
      return new StreamingResult(stream, contentType, totalSize, totalSize, 0, totalSize - 1, false);
    }

    Range range = parseRange(rangeHeader, totalSize);
    long start = range.start();
    long end = range.end();
    long chunkLength = end - start + 1;

    ResponseInputStream<GetObjectResponse> stream = r2Service.getObjectStream(key, start, end);
    return new StreamingResult(stream, contentType, chunkLength, totalSize, start, end, true);
  }

  private Range parseRange(String rangeHeader, long totalSize) {
    String rangeSpec = rangeHeader.substring(6).trim();
    if (rangeSpec.isEmpty() || !rangeSpec.contains("-")) {
      throw new IllegalArgumentException("Invalid Range header");
    }

    String[] parts = rangeSpec.split("-", 2);
    String startPart = parts[0].trim();
    String endPart = parts[1].trim();

    if (startPart.isEmpty()) {
      long suffixLength = parsePositiveLong(endPart, "Invalid Range header");
      if (suffixLength <= 0) {
        throw new IllegalArgumentException("Invalid Range header");
      }
      long start = Math.max(0, totalSize - suffixLength);
      return new Range(start, totalSize - 1);
    }

    long start = parseNonNegativeLong(startPart, "Invalid Range header");
    if (start >= totalSize) {
      throw new RangeNotSatisfiableException(totalSize);
    }

    long end = endPart.isEmpty()
            ? totalSize - 1
            : parseNonNegativeLong(endPart, "Invalid Range header");
    if (end < start) {
      throw new IllegalArgumentException("Invalid Range header");
    }
    if (end >= totalSize) {
      end = totalSize - 1;
    }

    return new Range(start, end);
  }

  private long parseNonNegativeLong(String value, String message) {
    try {
      long parsed = Long.parseLong(value);
      if (parsed < 0) {
        throw new IllegalArgumentException(message);
      }
      return parsed;
    } catch (NumberFormatException ex) {
      throw new IllegalArgumentException(message);
    }
  }

  private long parsePositiveLong(String value, String message) {
    long parsed = parseNonNegativeLong(value, message);
    if (parsed == 0) {
      throw new IllegalArgumentException(message);
    }
    return parsed;
  }

  private record Range(long start, long end) {}
}
