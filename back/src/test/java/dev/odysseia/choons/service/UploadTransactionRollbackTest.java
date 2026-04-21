package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.TrackResponse;
import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import dev.odysseia.choons.repository.TrackRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;

@SpringBootTest
@ActiveProfiles("test")
class UploadTransactionRollbackTest {

    @Autowired
    private TrackRepository trackRepository;
    @Autowired
    private AlbumRepository albumRepository;
    @Autowired
    private ArtistRepository artistRepository;
    @Autowired
    private TrackService trackService;
    @Autowired
    private AlbumService albumService;
    @Autowired
    private ArtistService artistService;

    @MockitoBean
    private R2Service r2Service;

    private Artist artist;
    private Album album;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        artist = artistRepository.save(Artist.builder().name("Test Artist " + suffix).build());
        album = albumRepository.save(Album.builder()
                .title("Test Album " + suffix)
                .artist(artist)
                .releaseYear(2024)
                .build());
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        trackRepository.deleteAll();
        albumRepository.deleteAll();
        artistRepository.deleteAll();
    }

    @Test
    void trackUpload_rollsBackWhenR2Fails() throws IOException {
        doThrow(new RuntimeException("R2 failure"))
                .when(r2Service).upload(anyString(), any(), anyLong(), anyString());

        byte[] mp3 = new byte[] { 0x49, 0x44, 0x33, 0x00 };
        MockMultipartFile file = new MockMultipartFile("audio", "test.mp3", "audio/mpeg", mp3);

        long trackCountBefore = trackRepository.count();

        assertThatThrownBy(() -> trackService.upload("Test Track", album.getId(), artist.getId(),
                1, 180, file))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("R2 failure");

        assertThat(trackRepository.count()).isEqualTo(trackCountBefore);
    }

    @Test
    void albumCreate_rollsBackWhenR2Fails() throws IOException {
        doThrow(new RuntimeException("R2 failure"))
                .when(r2Service).upload(anyString(), any(), anyLong(), anyString());

        byte[] jpeg = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00 };
        MockMultipartFile file = new MockMultipartFile("cover", "cover.jpg", "image/jpeg", jpeg);

        long albumCountBefore = albumRepository.count();

        assertThatThrownBy(() -> albumService.create("New Album", artist.getId(), 2024, file))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("R2 failure");

        assertThat(albumRepository.count()).isEqualTo(albumCountBefore);
    }

    @Test
    void artistCreate_rollsBackWhenR2Fails() throws IOException {
        doThrow(new RuntimeException("R2 failure"))
                .when(r2Service).upload(anyString(), any(), anyLong(), anyString());

        byte[] png = new byte[] { (byte) 0x89, 0x50, 0x4E, 0x47 };
        MockMultipartFile file = new MockMultipartFile("avatar", "avatar.png", "image/png", png);

        long artistCountBefore = artistRepository.count();

        assertThatThrownBy(() -> artistService.create("New Artist", "Bio", file))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("R2 failure");

        assertThat(artistRepository.count()).isEqualTo(artistCountBefore);
    }

    @Test
    void trackUpload_commitsWhenR2Succeeds() throws IOException {
        byte[] mp3 = new byte[] { 0x49, 0x44, 0x33, 0x00 };
        MockMultipartFile file = new MockMultipartFile("audio", "test.mp3", "audio/mpeg", mp3);

        TrackResponse result = trackService.upload("Success Track", album.getId(), artist.getId(),
                1, 180, file);

        assertThat(result).isNotNull();
        assertThat(result.title()).isEqualTo("Success Track");
        assertThat(trackRepository.findById(result.id())).isPresent();
    }
}
