package dev.odysseia.choons.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    @Mock
    private R2Service r2Service;

    @Mock
    private MultipartFile multipartFile;

    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp() {
        fileStorageService = new FileStorageService(r2Service);
    }

    @Test
    void validateAudioFile_acceptsMp3WithId3Header() throws IOException {
        byte[] mp3 = new byte[] { 0x49, 0x44, 0x33, 0x00 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(mp3));
        when(multipartFile.getContentType()).thenReturn("audio/mpeg");

        assertThat(fileStorageService.validateAudioFile(multipartFile)).isEqualTo("mp3");
    }

    @Test
    void validateAudioFile_acceptsMp3WithMpegFrame() throws IOException {
        byte[] mp3 = new byte[] { (byte) 0xFF, (byte) 0xFB, 0x00, 0x00 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(mp3));
        when(multipartFile.getContentType()).thenReturn("audio/mpeg");

        assertThat(fileStorageService.validateAudioFile(multipartFile)).isEqualTo("mp3");
    }

    @Test
    void validateAudioFile_acceptsOgg() throws IOException {
        byte[] ogg = new byte[] { 0x4F, 0x67, 0x67, 0x53 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(ogg));
        when(multipartFile.getContentType()).thenReturn("audio/ogg");

        assertThat(fileStorageService.validateAudioFile(multipartFile)).isEqualTo("ogg");
    }

    @Test
    void validateAudioFile_acceptsFlac() throws IOException {
        byte[] flac = new byte[] { 0x66, 0x4C, 0x61, 0x43 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(flac));
        when(multipartFile.getContentType()).thenReturn("audio/flac");

        assertThat(fileStorageService.validateAudioFile(multipartFile)).isEqualTo("flac");
    }

    @Test
    void validateAudioFile_acceptsWav() throws IOException {
        byte[] wav = new byte[] { 0x52, 0x49, 0x46, 0x46 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(wav));
        when(multipartFile.getContentType()).thenReturn("audio/wav");

        assertThat(fileStorageService.validateAudioFile(multipartFile)).isEqualTo("wav");
    }

    @Test
    void validateAudioFile_rejectsSpoofedContentType() throws IOException {
        byte[] jpeg = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(jpeg));
        when(multipartFile.getContentType()).thenReturn("audio/mpeg");

        assertThatThrownBy(() -> fileStorageService.validateAudioFile(multipartFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match claimed content type");
    }

    @Test
    void validateAudioFile_rejectsUnsupportedType() throws IOException {
        when(multipartFile.getContentType()).thenReturn("video/mp4");

        assertThatThrownBy(() -> fileStorageService.validateAudioFile(multipartFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported audio format");
    }

    @Test
    void validateImageFile_acceptsJpeg() throws IOException {
        byte[] jpeg = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(jpeg));
        when(multipartFile.getContentType()).thenReturn("image/jpeg");

        assertThat(fileStorageService.validateImageFile(multipartFile)).isEqualTo("jpg");
    }

    @Test
    void validateImageFile_acceptsPng() throws IOException {
        byte[] png = new byte[] { (byte) 0x89, 0x50, 0x4E, 0x47 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(png));
        when(multipartFile.getContentType()).thenReturn("image/png");

        assertThat(fileStorageService.validateImageFile(multipartFile)).isEqualTo("png");
    }

    @Test
    void validateImageFile_acceptsWebp() throws IOException {
        byte[] webp = new byte[] {
                0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
                0x57, 0x45, 0x42, 0x50
        };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(webp));
        when(multipartFile.getContentType()).thenReturn("image/webp");

        assertThat(fileStorageService.validateImageFile(multipartFile)).isEqualTo("webp");
    }

    @Test
    void validateImageFile_acceptsGif() throws IOException {
        byte[] gif = new byte[] { 0x47, 0x49, 0x46, 0x38 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(gif));
        when(multipartFile.getContentType()).thenReturn("image/gif");

        assertThat(fileStorageService.validateImageFile(multipartFile)).isEqualTo("gif");
    }

    @Test
    void validateImageFile_rejectsSpoofedAudioAsImage() throws IOException {
        byte[] mp3 = new byte[] { 0x49, 0x44, 0x33, 0x00 };
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(mp3));
        when(multipartFile.getContentType()).thenReturn("image/png");

        assertThatThrownBy(() -> fileStorageService.validateImageFile(multipartFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match claimed content type");
    }

    @Test
    void uploadAudio_buildsCorrectKeyAndUploads() throws IOException {
        UUID artistId = UUID.randomUUID();
        UUID albumId = UUID.randomUUID();
        UUID trackId = UUID.randomUUID();
        byte[] mp3 = new byte[] { 0x49, 0x44, 0x33, 0x00 };

        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(mp3));
        when(multipartFile.getContentType()).thenReturn("audio/mpeg");
        when(multipartFile.getSize()).thenReturn(1024L);

        fileStorageService.uploadAudio(multipartFile, artistId, albumId, trackId);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(r2Service).upload(keyCaptor.capture(), any(InputStream.class), anyLong(), anyString());
        assertThat(keyCaptor.getValue()).isEqualTo("audio/" + artistId + "/" + albumId + "/" + trackId + ".mp3");
    }

    @Test
    void uploadImage_buildsCorrectKeyForAlbum() throws IOException {
        UUID albumId = UUID.randomUUID();
        byte[] jpeg = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00 };

        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(jpeg));
        when(multipartFile.getContentType()).thenReturn("image/jpeg");
        when(multipartFile.getSize()).thenReturn(2048L);

        fileStorageService.uploadAlbumCover(multipartFile, albumId);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(r2Service).upload(keyCaptor.capture(), any(InputStream.class), anyLong(), anyString());
        assertThat(keyCaptor.getValue()).isEqualTo("images/albums/" + albumId + ".jpg");
    }

    @Test
    void uploadImage_buildsCorrectKeyForArtist() throws IOException {
        UUID artistId = UUID.randomUUID();
        byte[] png = new byte[] { (byte) 0x89, 0x50, 0x4E, 0x47 };

        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream(png));
        when(multipartFile.getContentType()).thenReturn("image/png");
        when(multipartFile.getSize()).thenReturn(4096L);

        fileStorageService.uploadArtistAvatar(multipartFile, artistId);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(r2Service).upload(keyCaptor.capture(), any(InputStream.class), anyLong(), anyString());
        assertThat(keyCaptor.getValue()).isEqualTo("images/artists/" + artistId + ".png");
    }
}
