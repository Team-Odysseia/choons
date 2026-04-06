package dev.odysseia.choons.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
public class SchemaPatchRunner implements ApplicationRunner {

  private final JdbcTemplate jdbcTemplate;

  public SchemaPatchRunner(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public void run(ApplicationArguments args) {
    jdbcTemplate.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS requests_blocked BOOLEAN NOT NULL DEFAULT FALSE"
    );
  }
}
