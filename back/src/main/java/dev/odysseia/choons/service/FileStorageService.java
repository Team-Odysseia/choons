package dev.odysseia.choons.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Map<String, String> ALLOWED_AUDIO_TYPES = Map.of(
            "audio/mpeg", "mp3",
            "audio/ogg", "ogg",
            "audio/flac", "flac",
            "audio/wav", "wav",
            "audio/x-flac", "flac",
            "audio/aac", "aac"
    );

    private static final Map<String, String> ALLOWED_IMAGE_TYPES = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif"
    );

    private final R2Service r2Service;

    public FileStorageService(R2Service r2Service) {
        this.r2Service = r2Service;
    }

    public String validateAudioFile(MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AUDIO_TYPES.containsKey(contentType)) {
            throw new IllegalArgumentException("Unsupported audio format: " + contentType);
        }

        String detected = detectAudioType(file);
        String expectedExt = ALLOWED_AUDIO_TYPES.get(contentType);
        if (!expectedExt.equals(detected)) {
            throw new IllegalArgumentException(
                    "File content does not match claimed content type. Claimed: " + contentType);
        }

        return expectedExt;
    }

    public String validateImageFile(MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.containsKey(contentType)) {
            throw new IllegalArgumentException("Unsupported image type: " + contentType);
        }

        String detected = detectImageType(file);
        String expectedExt = ALLOWED_IMAGE_TYPES.get(contentType);
        if (!expectedExt.equals(detected)) {
            throw new IllegalArgumentException(
                    "File content does not match claimed content type. Claimed: " + contentType);
        }

        return expectedExt;
    }

    public String uploadAudio(MultipartFile file, UUID artistId, UUID albumId, UUID trackId) throws IOException {
        String ext = validateAudioFile(file);
        String key = "audio/" + artistId + "/" + albumId + "/" + trackId + "." + ext;
        r2Service.upload(key, file.getInputStream(), file.getSize(), file.getContentType());
        return key;
    }

    public String uploadAlbumCover(MultipartFile file, UUID albumId) throws IOException {
        String ext = validateImageFile(file);
        String key = "images/albums/" + albumId + "." + ext;
        r2Service.upload(key, file.getInputStream(), file.getSize(), file.getContentType());
        return key;
    }

    public String uploadArtistAvatar(MultipartFile file, UUID artistId) throws IOException {
        String ext = validateImageFile(file);
        String key = "images/artists/" + artistId + "." + ext;
        r2Service.upload(key, file.getInputStream(), file.getSize(), file.getContentType());
        return key;
    }

    public void delete(String key) {
        r2Service.delete(key);
    }

    private String detectAudioType(MultipartFile file) throws IOException {
        byte[] header = readHeader(file);
        if (header.length < 3) return null;

        if (header[0] == 0x49 && header[1] == 0x44 && header[2] == 0x33) return "mp3";
        if (header.length >= 2 && (header[0] & 0xFF) == 0xFF && ((header[1] & 0xF0) == 0xF0 || (header[1] & 0xFE) == 0xFA)) return "mp3";
        if (header.length >= 4 && header[0] == 0x4F && header[1] == 0x67 && header[2] == 0x67 && header[3] == 0x53) return "ogg";
        if (header.length >= 4 && header[0] == 0x66 && header[1] == 0x4C && header[2] == 0x61 && header[3] == 0x43) return "flac";
        if (header.length >= 4 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46) return "wav";
        if (header.length >= 2 && (header[0] & 0xFF) == 0xFF && ((header[1] & 0xF6) == 0xF0 || (header[1] & 0xF6) == 0xF0)) return "aac";

        return null;
    }

    private String detectImageType(MultipartFile file) throws IOException {
        byte[] header = readHeader(file);
        if (header.length < 4) return null;

        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) return "jpg";
        if ((header[0] & 0xFF) == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) return "png";
        if (header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38) return "gif";
        if (header.length >= 12 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50) return "webp";

        return null;
    }

    private byte[] readHeader(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[12];
            int read = is.read(header);
            if (read < 0) return new byte[0];
            if (read < header.length) {
                byte[] actual = new byte[read];
                System.arraycopy(header, 0, actual, 0, read);
                return actual;
            }
            return header;
        }
    }
}
