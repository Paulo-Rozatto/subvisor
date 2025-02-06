package com.subvisor.server.api;

import com.subvisor.server.App;
import com.subvisor.server.models.Contour;
import com.subvisor.server.neuralnetwork.SamHq;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Objects;

import static com.subvisor.server.App.DATA_DIR_PATH;

@RestController
@RequestMapping("/api/nn")
@CrossOrigin(origins = {"http://localhost:1234", "http://localhost:8080"})
@Slf4j
public class NNApi {

    private static final Path CHECKPOINTS_PATH = Paths.get(App.DATA_DIR_PATH, "checkpoints");

    final private SamHq samHq = new SamHq();
    private String currentCheckpoint = "Default";

    @GetMapping("/predict")
    public ResponseEntity<Contour> predict(String path, String promptMask, String promptPoints, String promptLabels) {
        log.info("Predicting contour for {} with points '{}' and labels '{}'", path, promptPoints, promptLabels);

        String imagePath = Paths.get(DATA_DIR_PATH, "datasets", path).toString();
        String result = samHq.run(imagePath, promptMask, promptPoints, promptLabels);
        return ResponseEntity.ok(new Contour(result));
    }

    @GetMapping("/checkpoints")
    public ResponseEntity<List<String>> checkpoints() {
        String path = CHECKPOINTS_PATH.toString();
        File[] files = new File(path).listFiles(File::isFile);

        List<String> fileList = new LinkedList<>();

        if (files != null) {
            List<String> list = Arrays.stream(files)
                    .map(File::getName)
                    .sorted()
                    .toList();
            fileList.addAll(list);
        }

        fileList.add(0, "Default");
        return ResponseEntity.ok(fileList);
    }

    @PostMapping("/load-checkpoint")
    public void setCheckpoint(@RequestBody String checkpoint) {
        log.info("Loading checkpoint '{}'.", checkpoint);

        if (Objects.equals(checkpoint, "Default")) {
            samHq.updateDecoderSession(Objects.requireNonNull(getClass().getResourceAsStream("/models/decoder.onnx")));
            currentCheckpoint = checkpoint;
            return;
        }

        Path path = Paths.get(CHECKPOINTS_PATH.toString(), checkpoint);
        try {
            InputStream stream = new FileInputStream(path.toString());
            samHq.updateDecoderSession(stream);
            currentCheckpoint = checkpoint;
        } catch (FileNotFoundException e) {
            log.error("Failed to load checkpoint '{}'.", checkpoint, e);
        }
    }
}
