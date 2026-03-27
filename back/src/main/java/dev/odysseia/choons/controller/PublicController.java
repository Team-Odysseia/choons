package dev.odysseia.choons.controller;

import dev.odysseia.choons.repository.AlbumRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/public")
public class PublicController {

    @Autowired private AlbumRepository albumRepository;

    @GetMapping("/covers")
    public List<String> getCovers() {
        List<String> ids = albumRepository.findByCoverKeyIsNotNull()
                .stream()
                .map(a -> a.getId().toString())
                .collect(Collectors.toCollection(ArrayList::new));
        Collections.shuffle(ids);
        return ids.stream().limit(24).toList();
    }
}
