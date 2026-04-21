package dev.odysseia.choons.exception;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@ExtendWith(OutputCaptureExtension.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private GlobalExceptionHandler handler;

    @Test
    void handleGeneric_logsExceptionMessage(CapturedOutput output) {
        RuntimeException ex = new RuntimeException("something went wrong");
        MockHttpServletResponse response = new MockHttpServletResponse();

        ResponseEntity<?> result = handler.handleGeneric(ex, response);

        assertThat(result.getStatusCode().value()).isEqualTo(500);
        assertThat(output.getOut()).contains("something went wrong");
    }

    @Test
    void handleAsyncTimeout_returnsRequestTimeout(CapturedOutput output) {
        AsyncRequestTimeoutException ex = new AsyncRequestTimeoutException();
        MockHttpServletResponse response = new MockHttpServletResponse();

        ResponseEntity<?> result = handler.handleAsyncTimeout(ex, response);

        assertThat(result.getStatusCode().value()).isEqualTo(408);
        assertThat(output.getOut()).doesNotContain("Unhandled exception occurred");
    }
}
