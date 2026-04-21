package dev.odysseia.choons.service;

import dev.odysseia.choons.dto.PartyStateResponse;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class PartyEventsService {

  private static final long SSE_TIMEOUT_MS = 300_000L;
  private final Map<String, CopyOnWriteArrayList<SseEmitter>> emittersByParty = new ConcurrentHashMap<>();

  public SseEmitter subscribe(String inviteCode) {
    String normalized = inviteCode.toUpperCase();
    SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
    emittersByParty.computeIfAbsent(normalized, key -> new CopyOnWriteArrayList<>()).add(emitter);

    emitter.onCompletion(() -> remove(normalized, emitter));
    emitter.onTimeout(() -> remove(normalized, emitter));
    emitter.onError((ex) -> remove(normalized, emitter));

    return emitter;
  }

  public void sendInitialState(SseEmitter emitter, PartyStateResponse state) {
    sendEvent(emitter, "state", state);
  }

  public void publishState(String inviteCode, PartyStateResponse state) {
    publish(inviteCode, "state", state);
  }

  public void publishEnded(String inviteCode) {
    String normalized = inviteCode.toUpperCase();
    publish(normalized, "ended", "{}");
    List<SseEmitter> emitters = emittersByParty.remove(normalized);
    if (emitters == null) return;
    for (SseEmitter emitter : emitters) {
      emitter.complete();
    }
  }

  @Scheduled(fixedDelay = 15000)
  public void heartbeat() {
    for (Map.Entry<String, CopyOnWriteArrayList<SseEmitter>> entry : emittersByParty.entrySet()) {
      String inviteCode = entry.getKey();
      for (SseEmitter emitter : new ArrayList<>(entry.getValue())) {
        sendEvent(inviteCode, emitter, "heartbeat", "ok");
      }
    }
  }

  private void publish(String inviteCode, String event, Object data) {
    String normalized = inviteCode.toUpperCase();
    List<SseEmitter> emitters = emittersByParty.get(normalized);
    if (emitters == null || emitters.isEmpty()) return;
    for (SseEmitter emitter : new ArrayList<>(emitters)) {
      sendEvent(normalized, emitter, event, data);
    }
  }

  private void sendEvent(SseEmitter emitter, String event, Object data) {
    sendEvent(null, emitter, event, data);
  }

  private void sendEvent(String inviteCode, SseEmitter emitter, String event, Object data) {
    try {
      emitter.send(SseEmitter.event().name(event).data(data));
    } catch (IOException ex) {
      if (inviteCode != null) {
        remove(inviteCode, emitter);
      }
    }
  }

  private void remove(String inviteCode, SseEmitter emitter) {
    List<SseEmitter> emitters = emittersByParty.get(inviteCode);
    if (emitters == null) return;
    emitters.remove(emitter);
    if (emitters.isEmpty()) {
      emittersByParty.remove(inviteCode);
    }
  }
}
