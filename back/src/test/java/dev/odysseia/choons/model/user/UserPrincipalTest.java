package dev.odysseia.choons.model.user;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class UserPrincipalTest {

    @Test
    void fromUser_mapsFieldsAndDoesNotExposePassword() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .username("testuser")
                .password("hashed_password_should_not_leak")
                .role(UserRole.ADMIN)
                .build();

        UserPrincipal principal = UserPrincipal.from(user);

        assertThat(principal.id()).isEqualTo(user.getId());
        assertThat(principal.username()).isEqualTo("testuser");
        assertThat(principal.role()).isEqualTo(UserRole.ADMIN);

        // Ensure password is not accessible via reflection on the record
        assertThat(principal.getClass().getRecordComponents())
                .extracting(java.lang.reflect.RecordComponent::getName)
                .doesNotContain("password");
    }
}
