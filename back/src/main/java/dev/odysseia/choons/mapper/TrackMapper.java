package dev.odysseia.choons.mapper;

import dev.odysseia.choons.dto.TrackResponse;
import dev.odysseia.choons.model.music.Track;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Set;

@Mapper(componentModel = "spring", uses = {AlbumMapper.class, ArtistMapper.class})
public interface TrackMapper {

    @Mapping(target = "hifi", expression = "java(isHifi(track.getContentType()))")
    TrackResponse toResponse(Track track);

    default boolean isHifi(String contentType) {
        return contentType != null && Set.of("audio/flac", "audio/x-flac", "audio/wav").contains(contentType);
    }
}
