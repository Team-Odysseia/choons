package dev.odysseia.choons.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SubmitAlbumRequest(
        @NotBlank @Size(max = 160) String albumName,
        @NotBlank @Size(max = 160) String artistName,
        @NotBlank
        @Size(max = 600)
        @Pattern(regexp = "^https?://.+", message = "externalUrl must be a valid http/https URL")
        String externalUrl
) {}
