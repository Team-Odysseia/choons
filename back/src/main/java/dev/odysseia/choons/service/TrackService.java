package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.TrackResponse;
import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import dev.odysseia.choons.repository.TrackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class TrackService {

  private static final Map<String, String> ALLOWED_TYPES = Map.of(
          "audio/mpeg", "mp3",
          "audio/ogg", "ogg",
          "audio/flac", "flac",
          "audio/wav", "wav",
          "audio/x-flac", "flac",
          "audio/aac", "aac"
  );

  @Autowired private TrackRepository trackRepository;
  @Autowired private AlbumRepository albumRepository;
  @Autowired private ArtistRepository artistRepository;
  @Autowired private R2Service r2Service;
  @Autowired private AlbumService albumService;
  @Autowired private ArtistService artistService;

  public TrackResponse upload(String title, UUID albumId, UUID artistId,
                              int trackNumber, int durationSeconds,
                              MultipartFile audioFile) throws IOException {
    String contentType = audioFile.getContentType();
    if (contentType == null || !ALLOWED_TYPES.containsKey(contentType)) {
      throw new IllegalArgumentException("Unsupported audio format: " + contentType);
    }

    Album album = albumRepository.findById(albumId)
            .orElseThrow(() -> new NoSuchElementException("Album not found: " + albumId));
    Artist artist = artistRepository.findById(artistId)
            .orElseThrow(() -> new NoSuchElementException("Artist not found: " + artistId));

    // Save first to get the generated ID, then upload with that ID in the key
    Track trackEntity = Track.builder()
            .title(title)
            .album(album)
            .artist(artist)
            .trackNumber(trackNumber)
            .durationSeconds(durationSeconds)
            .r2Key("pending")
            .contentType(contentType)
            .build();
    Track saved = trackRepository.save(trackEntity);

    String ext = ALLOWED_TYPES.get(contentType);
    String r2Key = "audio/" + artistId + "/" + albumId + "/" + saved.getId() + "." + ext;

    r2Service.upload(r2Key, audioFile.getInputStream(), audioFile.getSize(), contentType);

    saved.setR2Key(r2Key);
    Track track = trackRepository.save(saved);

    return toResponse(track);
  }

  public List<TrackResponse> uploadBatch(UUID albumId, UUID artistId,
                                          List<String> titles,
                                          List<Integer> durations,
                                          List<MultipartFile> files) throws IOException {
    if (files.size() != titles.size() || files.size() != durations.size()) {
      throw new IllegalArgumentException(
        "Mismatched batch upload lists: files=" + files.size() +
        " titles=" + titles.size() + " durations=" + durations.size());
    }
    List<TrackResponse> results = new ArrayList<>();
    for (int i = 0; i < files.size(); i++) {
      results.add(upload(titles.get(i), albumId, artistId, i + 1, durations.get(i), files.get(i)));
    }
    return results;
  }

  public List<TrackResponse> findByAlbum(UUID albumId) {
    return trackRepository.findByAlbumIdOrderByTrackNumberAsc(albumId).stream()
            .map(this::toResponse)
            .toList();
  }

  public List<TrackResponse> findAll() {
    return trackRepository.findAll().stream()
            .map(this::toResponse)
            .toList();
  }

  public TrackResponse findById(UUID id) {
    return trackRepository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new NoSuchElementException("Track not found: " + id));
  }

  public Track getTrackEntity(UUID id) {
    return trackRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Track not found: " + id));
  }

  public TrackResponse toResponse(Track track) {
    return new TrackResponse(
            track.getId(),
            track.getTitle(),
            albumService.toResponse(track.getAlbum()),
            artistService.toResponse(track.getArtist()),
            track.getTrackNumber(),
            track.getDurationSeconds(),
            track.getCreatedAt()
    );
  }
}
