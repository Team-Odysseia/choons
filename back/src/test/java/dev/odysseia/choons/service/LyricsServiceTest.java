package dev.odysseia.choons.service;

import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.repository.TrackRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LyricsServiceTest {

    @Mock
    private TrackRepository trackRepository;

    private ObjectMapper objectMapper;
    private LyricsService lyricsService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        lyricsService = spy(new LyricsService(trackRepository, objectMapper));
    }

    @Test
    void tryFetchAndSave_savesTrackWhenLrclibIdFound() throws Exception {
        UUID trackId = UUID.randomUUID();
        Track track = Track.builder()
                .id(trackId)
                .title("Test Track")
                .build();

        doReturn("{\"id\":123}").when(lyricsService).fetchLrclibResponse(any());
        when(trackRepository.findById(trackId)).thenReturn(Optional.of(track));

        lyricsService.tryFetchAndSave(trackId, "Test Track", "Artist", "Album", 180);

        assertThat(track.getLrclibId()).isEqualTo(123);
        verify(trackRepository).save(track);
    }

    @Test
    void tryFetchAndSave_doesNotSaveWhenNoLrclibId() throws Exception {
        UUID trackId = UUID.randomUUID();

        doReturn("{\"id\":null}").when(lyricsService).fetchLrclibResponse(any());

        lyricsService.tryFetchAndSave(trackId, "Test Track", "Artist", "Album", 180);

        verify(trackRepository, never()).findById(any());
        verify(trackRepository, never()).save(any());
    }

    @Test
    void tryFetchAndSave_doesNotSaveWhenResponseNull() throws Exception {
        UUID trackId = UUID.randomUUID();

        doReturn(null).when(lyricsService).fetchLrclibResponse(any());

        lyricsService.tryFetchAndSave(trackId, "Test Track", "Artist", "Album", 180);

        verify(trackRepository, never()).findById(any());
        verify(trackRepository, never()).save(any());
    }

    @Test
    void tryFetchAndSave_doesNotThrowOnException() throws Exception {
        UUID trackId = UUID.randomUUID();

        doReturn("invalid json").when(lyricsService).fetchLrclibResponse(any());

        lyricsService.tryFetchAndSave(trackId, "Test Track", "Artist", "Album", 180);

        verify(trackRepository, never()).save(any());
    }
}
