package dev.odysseia.choons.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "rate-limit")
@Getter
@Setter
public class RateLimitProperties {
    private int loginCapacity = 10;
    private int loginRefillPerMinute = 10;
    private int streamCapacity = 60;
    private int streamRefillPerMinute = 60;
}
