package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.AlbumResponse;
import dev.odysseia.choons.mapper.AlbumMapper;
import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import dev.odysseia.choons.repository.PlaylistTrackRepository;
import dev.odysseia.choons.repository.TrackRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class AlbumService {

    private final AlbumRepository albumRepository;
    private final ArtistRepository artistRepository;
    private final TrackRepository trackRepository;
    private final PlaylistTrackRepository playlistTrackRepository;
    private final FileStorageService fileStorageService;
    private final AlbumMapper albumMapper;

    public AlbumService(AlbumRepository albumRepository,
                        ArtistRepository artistRepository,
                        TrackRepository trackRepository,
                        PlaylistTrackRepository playlistTrackRepository,
                        FileStorageService fileStorageService,
                        AlbumMapper albumMapper) {
        this.albumRepository = albumRepository;
        this.artistRepository = artistRepository;
        this.trackRepository = trackRepository;
        this.playlistTrackRepository = playlistTrackRepository;
        this.fileStorageService = fileStorageService;
        this.albumMapper = albumMapper;
    }

    @Transactional
    public AlbumResponse create(String title, UUID artistId, int releaseYear, MultipartFile coverFile) throws IOException {
        Artist artist = artistRepository.findById(artistId)
                .orElseThrow(() -> new NoSuchElementException("Artist not found: " + artistId));
        Album album = albumRepository.save(Album.builder()
                .title(title)
                .artist(artist)
                .releaseYear(releaseYear)
                .build());

        if (coverFile != null && !coverFile.isEmpty()) {
            String key = fileStorageService.uploadAlbumCover(coverFile, album.getId());
            album.setCoverKey(key);
            album = albumRepository.save(album);
        }

        return toResponse(album);
    }

    @Transactional
    public AlbumResponse update(UUID id, String title, UUID artistId, int releaseYear, MultipartFile coverFile) throws IOException {
        Album album = albumRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
        Artist artist = artistRepository.findById(artistId)
                .orElseThrow(() -> new NoSuchElementException("Artist not found: " + artistId));
        album.setTitle(title);
        album.setArtist(artist);
        album.setReleaseYear(releaseYear);

        if (coverFile != null && !coverFile.isEmpty()) {
            if (album.getCoverKey() != null) {
                fileStorageService.delete(album.getCoverKey());
            }
            String key = fileStorageService.uploadAlbumCover(coverFile, id);
            album.setCoverKey(key);
        }

        return toResponse(albumRepository.save(album));
    }

    @Transactional
    public void delete(UUID id) {
        Album album = albumRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
        List<Track> tracks = trackRepository.findByAlbumIdOrderByTrackNumberAsc(id);
        if (!tracks.isEmpty()) {
            List<UUID> trackIds = tracks.stream().map(Track::getId).toList();
            playlistTrackRepository.deleteByTrackIdIn(trackIds);
            for (Track track : tracks) {
                if (track.getR2Key() != null && !track.getR2Key().equals("pending")) {
                    fileStorageService.delete(track.getR2Key());
                }
            }
            trackRepository.deleteAll(tracks);
        }
        if (album.getCoverKey() != null) {
            fileStorageService.delete(album.getCoverKey());
        }
        albumRepository.delete(album);
    }

    @Transactional
    public void deleteCover(UUID id) {
        Album album = albumRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
        if (album.getCoverKey() != null) {
            fileStorageService.delete(album.getCoverKey());
            album.setCoverKey(null);
            albumRepository.save(album);
        }
    }

    @Transactional(readOnly = true)
    public List<AlbumResponse> findAll() {
        return albumRepository.findAllByOrderByArtistNameAscTitleAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AlbumResponse> findByArtist(UUID artistId) {
        return albumRepository.findByArtistIdOrderByReleaseYearDesc(artistId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AlbumResponse> search(UUID artistId, String query) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        List<AlbumResponse> source = artistId != null ? findByArtist(artistId) : findAll();
        if (normalized.isBlank()) {
            return source;
        }
        return source.stream()
                .filter(album -> album.title().toLowerCase().contains(normalized)
                        || album.artist().name().toLowerCase().contains(normalized))
                .toList();
    }

    @Transactional(readOnly = true)
    public AlbumResponse findById(UUID id) {
        return albumRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NoSuchElementException("Album not found: " + id));
    }

    public AlbumResponse toResponse(Album album) {
        return albumMapper.toResponse(album);
    }
}
