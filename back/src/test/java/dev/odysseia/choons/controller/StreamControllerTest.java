package dev.odysseia.choons.controller;

import dev.odysseia.choons.model.music.Album;
import dev.odysseia.choons.model.music.Artist;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.model.user.UserRole;
import dev.odysseia.choons.repository.AlbumRepository;
import dev.odysseia.choons.repository.ArtistRepository;
import dev.odysseia.choons.repository.TrackRepository;
import dev.odysseia.choons.repository.UserRepository;
import dev.odysseia.choons.service.JwtService;
import dev.odysseia.choons.service.StreamTrackingService;
import dev.odysseia.choons.service.StreamingService;
import dev.odysseia.choons.service.StreamingService.StreamingResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.NoSuchElementException;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testa a camada HTTP do StreamController: status codes, headers e corpo.
 * StreamingService é mockado — sua lógica de range é testada em StreamingServiceTest.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.threads.virtual.enabled=false")
class StreamControllerTest {

    @Autowired WebApplicationContext wac;
    @Autowired UserRepository userRepository;
    @Autowired ArtistRepository artistRepository;
    @Autowired AlbumRepository albumRepository;
    @Autowired TrackRepository trackRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;

    // Mockar StreamingService mantém o corpo assíncrono livre de stubs Mockito —
    // apenas usa ByteArrayInputStream já construído, sem race conditions.
    @MockitoBean StreamingService streamingService;
    @MockitoBean StreamTrackingService streamTrackingService;

    private MockMvc mockMvc;
    private String listenerToken;
    private UUID trackId;

    private static final byte[] AUDIO_BYTES = new byte[1024];
    static { Arrays.fill(AUDIO_BYTES, (byte) 0xAA); }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        User listener = userRepository.save(User.builder()
                .username("stream_listener")
                .password(passwordEncoder.encode("pass"))
                .role(UserRole.LISTENER)
                .build());
        listenerToken = "Bearer " + jwtService.generateToken(listener);

        Artist artist = artistRepository.save(Artist.builder().name("Stream Artist").bio("").build());
        Album album = albumRepository.save(Album.builder()
                .title("Stream Album").artist(artist).releaseYear(2024).build());
        Track track = trackRepository.save(Track.builder()
                .title("Stream Track").album(album).artist(artist)
                .trackNumber(1).durationSeconds(60)
                .r2Key("audio/test/track.mp3").contentType("audio/mpeg")
                .build());
        trackId = track.getId();
    }

    @AfterEach
    void tearDown() {
        trackRepository.deleteAll();
        albumRepository.deleteAll();
        artistRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ─── Autenticação ─────────────────────────────────────────────────────────

    @Test
    void stream_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/stream/{id}", trackId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void stream_withUnknownTrackId_returns404() throws Exception {
        UUID unknown = UUID.randomUUID();
        when(streamingService.stream(unknown, null))
                .thenThrow(new NoSuchElementException("Track not found: " + unknown));

        mockMvc.perform(get("/stream/{id}", unknown)
                        .header(HttpHeaders.AUTHORIZATION, listenerToken))
                .andExpect(status().isNotFound());
    }

    // ─── 200 OK — arquivo completo ────────────────────────────────────────────

    @Test
    void stream_withNoRange_returns200WithFullContent() throws Exception {
        when(streamingService.stream(trackId, null))
                .thenReturn(fullResult(AUDIO_BYTES));

        MvcResult async = mockMvc.perform(get("/stream/{id}", trackId)
                        .header(HttpHeaders.AUTHORIZATION, listenerToken))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(async))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "audio/mpeg"))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, String.valueOf(AUDIO_BYTES.length)))
                .andExpect(content().bytes(AUDIO_BYTES));
    }

    // ─── 206 Partial Content ─────────────────────────────────────────────────

    @Test
    void stream_withRangeHeader_returns206WithCorrectHeaders() throws Exception {
        byte[] chunk = Arrays.copyOfRange(AUDIO_BYTES, 0, 512);
        when(streamingService.stream(trackId, "bytes=0-511"))
                .thenReturn(partialResult(chunk, 0, 511, AUDIO_BYTES.length));

        MvcResult async = mockMvc.perform(get("/stream/{id}", trackId)
                        .header(HttpHeaders.AUTHORIZATION, listenerToken)
                        .header(HttpHeaders.RANGE, "bytes=0-511"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(async))
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "audio/mpeg"))
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "512"))
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE,
                        "bytes 0-511/" + AUDIO_BYTES.length))
                .andExpect(content().bytes(chunk));
    }

    @Test
    void stream_withOpenEndedRange_returns206() throws Exception {
        byte[] chunk = Arrays.copyOfRange(AUDIO_BYTES, 512, 1024);
        when(streamingService.stream(trackId, "bytes=512-"))
                .thenReturn(partialResult(chunk, 512, 1023, AUDIO_BYTES.length));

        MvcResult async = mockMvc.perform(get("/stream/{id}", trackId)
                        .header(HttpHeaders.AUTHORIZATION, listenerToken)
                        .header(HttpHeaders.RANGE, "bytes=512-"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(async))
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE,
                        "bytes 512-1023/" + AUDIO_BYTES.length));
    }

    // ─── Token via query param ────────────────────────────────────────────────

    @Test
    void stream_withTokenAsQueryParam_returns200() throws Exception {
        when(streamingService.stream(trackId, null))
                .thenReturn(fullResult(AUDIO_BYTES));

        String rawToken = listenerToken.replace("Bearer ", "");
        MvcResult async = mockMvc.perform(get("/stream/{id}", trackId)
                        .param("token", rawToken))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(async))
                .andExpect(status().isOk());
    }

    // ─── POST /played ─────────────────────────────────────────────────────────

    @Test
    void recordPlay_withValidToken_returns204() throws Exception {
        mockMvc.perform(post("/stream/{id}/played", trackId)
                        .header(HttpHeaders.AUTHORIZATION, listenerToken))
                .andExpect(status().isNoContent());

        verify(streamTrackingService).recordStream(eq(trackId), eq("stream_listener"));
    }

    @Test
    void recordPlay_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/stream/{id}/played", trackId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void recordPlay_withUnknownTrack_returns404() throws Exception {
        UUID unknown = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new java.util.NoSuchElementException("Track not found"))
                .when(streamTrackingService).recordStream(eq(unknown), any());

        mockMvc.perform(post("/stream/{id}/played", unknown)
                        .header(HttpHeaders.AUTHORIZATION, listenerToken))
                .andExpect(status().isNotFound());
    }

    // ─── Builders de StreamingResult ─────────────────────────────────────────

    private static StreamingResult fullResult(byte[] data) {
        return new StreamingResult(wrapStream(data), "audio/mpeg",
                data.length, data.length, 0, data.length - 1, false);
    }

    private static StreamingResult partialResult(byte[] chunk, long start, long end, long total) {
        return new StreamingResult(wrapStream(chunk), "audio/mpeg",
                chunk.length, total, start, end, true);
    }

    private static ResponseInputStream<GetObjectResponse> wrapStream(byte[] data) {
        GetObjectResponse r = GetObjectResponse.builder()
                .contentType("audio/mpeg")
                .contentLength((long) data.length)
                .build();
        return new ResponseInputStream<>(r,
                AbortableInputStream.create(new ByteArrayInputStream(data)));
    }
}
