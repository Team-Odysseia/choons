package dev.odysseia.choons.service;

import dev.odysseia.choons.model.music.Track;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.UUID;

@Service
public class StreamingService {

  @Autowired private TrackService trackService;
  @Autowired private R2Service r2Service;

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

    String rangeSpec = rangeHeader.substring(6); // strip "bytes="
    String[] parts = rangeSpec.split("-", 2);
    long start = Long.parseLong(parts[0]);
    long end = (parts.length > 1 && !parts[1].isEmpty())
            ? Long.parseLong(parts[1])
            : totalSize - 1;

    if (end >= totalSize) end = totalSize - 1;
    long chunkLength = end - start + 1;

    ResponseInputStream<GetObjectResponse> stream = r2Service.getObjectStream(key, start, end);
    return new StreamingResult(stream, contentType, chunkLength, totalSize, start, end, true);
  }
}
