package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.ArtistResponse;
import dev.odysseia.choons.mapper.ArtistMapper;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class ArtistService {

    private final ArtistRepository artistRepository;
    private final AlbumRepository albumRepository;
    private final AlbumService albumService;
    private final FileStorageService fileStorageService;
    private final ArtistMapper artistMapper;

    public ArtistService(ArtistRepository artistRepository,
                         AlbumRepository albumRepository,
                         @Lazy AlbumService albumService,
                         FileStorageService fileStorageService,
                         ArtistMapper artistMapper) {
        this.artistRepository = artistRepository;
        this.albumRepository = albumRepository;
        this.albumService = albumService;
        this.fileStorageService = fileStorageService;
        this.artistMapper = artistMapper;
    }

    @Transactional
    public ArtistResponse create(String name, String bio, MultipartFile avatarFile) throws IOException {
        Artist artist = artistRepository.save(Artist.builder()
                .name(name)
                .bio(bio)
                .build());

        if (avatarFile != null && !avatarFile.isEmpty()) {
            String key = fileStorageService.uploadArtistAvatar(avatarFile, artist.getId());
            artist.setAvatarKey(key);
            artist = artistRepository.save(artist);
        }

        return toResponse(artist);
    }

    @Transactional
    public ArtistResponse update(UUID id, String name, String bio, MultipartFile avatarFile) throws IOException {
        Artist artist = artistRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Artist not found: " + id));
        artist.setName(name);
        artist.setBio(bio);

        if (avatarFile != null && !avatarFile.isEmpty()) {
            if (artist.getAvatarKey() != null) {
                fileStorageService.delete(artist.getAvatarKey());
            }
            String key = fileStorageService.uploadArtistAvatar(avatarFile, id);
            artist.setAvatarKey(key);
        }

        return toResponse(artistRepository.save(artist));
    }

    @Transactional
    public void delete(UUID id) {
        Artist artist = artistRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Artist not found: " + id));
        albumRepository.findByArtistIdOrderByReleaseYearDesc(id)
                .forEach(album -> albumService.delete(album.getId()));
        if (artist.getAvatarKey() != null) {
            fileStorageService.delete(artist.getAvatarKey());
        }
        artistRepository.delete(artist);
    }

    @Transactional
    public void deleteAvatar(UUID id) {
        Artist artist = artistRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Artist not found: " + id));
        if (artist.getAvatarKey() != null) {
            fileStorageService.delete(artist.getAvatarKey());
            artist.setAvatarKey(null);
            artistRepository.save(artist);
        }
    }

    @Transactional(readOnly = true)
    public List<ArtistResponse> findAll() {
        return artistRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ArtistResponse> search(String query) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        if (normalized.isBlank()) {
            return findAll();
        }
        return artistRepository.findAllByOrderByNameAsc().stream()
                .filter(artist -> artist.getName() != null
                        && artist.getName().toLowerCase().contains(normalized))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ArtistResponse findById(UUID id) {
        return artistRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NoSuchElementException("Artist not found: " + id));
    }

    public ArtistResponse toResponse(Artist artist) {
        return artistMapper.toResponse(artist);
    }
}
