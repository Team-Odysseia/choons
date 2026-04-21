package dev.odysseia.choons.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static org.assertj.core.api.Assertions.assertThat;

class PartyEventsServiceTest {

    @Test
    void emitterHasFiveMinuteTimeout() {
        PartyEventsService service = new PartyEventsService();
        SseEmitter emitter = service.subscribe("TESTCODE");
        assertThat(emitter.getTimeout()).isEqualTo(300_000L);
    }
}
