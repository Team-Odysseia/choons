package dev.odysseia.choons.service;

import dev.odysseia.choons.model.music.StreamEvent;
import dev.odysseia.choons.model.music.Track;
import dev.odysseia.choons.model.user.User;
import dev.odysseia.choons.repository.StreamEventRepository;
import dev.odysseia.choons.repository.TrackRepository;
import dev.odysseia.choons.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class StreamTrackingService {

    @Autowired private StreamEventRepository streamEventRepository;
    @Autowired private TrackRepository trackRepository;
    @Autowired private UserRepository userRepository;

    @Transactional
    public void recordStream(UUID trackId, String username) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new NoSuchElementException("Track not found: " + trackId));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + username));
        streamEventRepository.save(StreamEvent.builder()
                .track(track)
                .user(user)
                .build());
    }
}
