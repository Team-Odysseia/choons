package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.TrackResponse;
import dev.odysseia.choons.dto.UpdateTrackRequest;
import dev.odysseia.choons.mapper.TrackMapper;
import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import dev.odysseia.choons.repository.PlaylistTrackRepository;
import dev.odysseia.choons.repository.StreamEventRepository;
import dev.odysseia.choons.repository.TrackRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class TrackService {

    private final TrackRepository trackRepository;
    private final AlbumRepository albumRepository;
    private final ArtistRepository artistRepository;
    private final PlaylistTrackRepository playlistTrackRepository;
    private final StreamEventRepository streamEventRepository;
    private final FileStorageService fileStorageService;
    private final LyricsService lyricsService;
    private final TrackMapper trackMapper;

    public TrackService(TrackRepository trackRepository,
                        AlbumRepository albumRepository,
                        ArtistRepository artistRepository,
                        PlaylistTrackRepository playlistTrackRepository,
                        StreamEventRepository streamEventRepository,
                        FileStorageService fileStorageService,
                        LyricsService lyricsService,
                        TrackMapper trackMapper) {
        this.trackRepository = trackRepository;
        this.albumRepository = albumRepository;
        this.artistRepository = artistRepository;
        this.playlistTrackRepository = playlistTrackRepository;
        this.streamEventRepository = streamEventRepository;
        this.fileStorageService = fileStorageService;
        this.lyricsService = lyricsService;
        this.trackMapper = trackMapper;
    }

    @Transactional
    public TrackResponse upload(String title, UUID albumId, UUID artistId,
                                int trackNumber, int durationSeconds,
                                MultipartFile audioFile) throws IOException {
        Album album = albumRepository.findById(albumId)
                .orElseThrow(() -> new NoSuchElementException("Album not found: " + albumId));
        Artist artist = artistRepository.findById(artistId)
                .orElseThrow(() -> new NoSuchElementException("Artist not found: " + artistId));

        Track trackEntity = Track.builder()
                .title(title)
                .album(album)
                .artist(artist)
                .trackNumber(trackNumber)
                .durationSeconds(durationSeconds)
                .r2Key("pending")
                .contentType(audioFile.getContentType())
                .build();
        Track saved = trackRepository.save(trackEntity);

        String r2Key = fileStorageService.uploadAudio(audioFile, artistId, albumId, saved.getId());

        saved.setR2Key(r2Key);
        Track track = trackRepository.save(saved);

        lyricsService.tryFetchAndSave(track.getId(), title, artist.getName(), album.getTitle(), durationSeconds);

        return toResponse(track);
    }

    @Transactional
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

    @Transactional
    public TrackResponse update(UUID id, String title, int trackNumber) {
        Track track = trackRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Track not found: " + id));
        track.setTitle(title);
        track.setTrackNumber(trackNumber);
        return toResponse(trackRepository.save(track));
    }

    @Transactional
    public List<TrackResponse> updateAll(UUID albumId, List<UpdateTrackRequest> updates) {
        List<TrackResponse> results = new ArrayList<>();
        for (UpdateTrackRequest req : updates) {
            Track track = trackRepository.findById(req.id())
                    .orElseThrow(() -> new NoSuchElementException("Track not found: " + req.id()));
            if (!track.getAlbum().getId().equals(albumId)) {
                throw new IllegalArgumentException("Track " + req.id() + " does not belong to album " + albumId);
            }
            track.setTitle(req.title());
            track.setTrackNumber(req.trackNumber());
            results.add(toResponse(trackRepository.save(track)));
        }
        return results;
    }

    @Transactional
    public void delete(UUID id) {
        Track track = trackRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Track not found: " + id));
        playlistTrackRepository.deleteByTrackId(id);
        if (track.getR2Key() != null && !track.getR2Key().equals("pending")) {
            fileStorageService.delete(track.getR2Key());
        }
        trackRepository.delete(track);
    }

    @Transactional(readOnly = true)
    public List<TrackResponse> findByAlbum(UUID albumId) {
        return trackRepository.findByAlbumIdOrderByTrackNumberAsc(albumId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrackResponse> findAll() {
        return trackRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrackResponse> search(UUID albumId, String query) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        List<TrackResponse> source = albumId != null ? findByAlbum(albumId) : findAll();
        if (normalized.isBlank()) {
            return source;
        }
        return source.stream()
                .filter(track -> track.title().toLowerCase().contains(normalized)
                        || track.artist().name().toLowerCase().contains(normalized)
                        || track.album().title().toLowerCase().contains(normalized))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrackResponse> findMostPlayed(int limit) {
        return streamEventRepository.findTopTracks(PageRequest.of(0, limit)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TrackResponse findById(UUID id) {
        return trackRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NoSuchElementException("Track not found: " + id));
    }

    @Transactional(readOnly = true)
    public Track getTrackEntity(UUID id) {
        return trackRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Track not found: " + id));
    }

    public TrackResponse toResponse(Track track) {
        return trackMapper.toResponse(track);
    }

    @Transactional
    public TrackResponse updateLrclibId(UUID id, Integer lrclibId) {
        Track track = trackRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Track not found: " + id));
        track.setLrclibId(lrclibId);
        return toResponse(trackRepository.save(track));
    }
}
