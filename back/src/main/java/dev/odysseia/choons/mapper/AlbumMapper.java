package dev.odysseia.choons.mapper;

import dev.odysseia.choons.dto.AlbumResponse;
import dev.odysseia.choons.model.music.Album;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = ArtistMapper.class)
public interface AlbumMapper {

    @Mapping(target = "coverUrl", expression = "java(album.getCoverKey() != null ? \"/media/images/albums/\" + album.getId() : null)")
    AlbumResponse toResponse(Album album);
}
