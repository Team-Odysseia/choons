package dev.odysseia.choons.model.user;

import java.util.UUID;

public record UserPrincipal(UUID id, String username, UserRole role) {
    public static UserPrincipal from(User user) {
        return new UserPrincipal(user.getId(), user.getUsername(), user.getRole());
    }
}
