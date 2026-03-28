package dev.odysseia.choons.mapper;

import dev.odysseia.choons.dto.ArtistResponse;
import dev.odysseia.choons.model.music.Artist;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ArtistMapper {

    @Mapping(target = "avatarUrl", expression = "java(artist.getAvatarKey() != null ? \"/media/images/artists/\" + artist.getId() : null)")
    ArtistResponse toResponse(Artist artist);
}
