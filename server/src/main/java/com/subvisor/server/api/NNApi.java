package com.subvisor.server.api;

import com.subvisor.server.App;
import com.subvisor.server.models.Contour;
import com.subvisor.server.neuralnetwork.SamHq;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
public class NNApi {

    private static final Path CHECKPOINTS_PATH = Paths.get(App.DATA_DIR_PATH, "checkpoints");

    final private SamHq samHq = new SamHq();

    @GetMapping("/predict")
    public Contour predict(String path, String promptMask, String promptPoints, String promptLabels) {
        String imagePath = Paths.get(DATA_DIR_PATH, "datasets", path).toString();
        String result = samHq.run(imagePath, promptMask, promptPoints, promptLabels);
        return new Contour(result);
    }

    @GetMapping("/checkpoints")
    public List<String> checkpoints() {
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
        return fileList;
    }

    @PostMapping("/load-checkpoint")
    public void setCheckpoint(@RequestBody String checkpoint) {
        if (Objects.equals(checkpoint, "Default")) {
            samHq.updateDecoderSession(Objects.requireNonNull(getClass().getResourceAsStream("/models/decoder.onnx")));
            return;
        }

        Path path = Paths.get(CHECKPOINTS_PATH.toString(), checkpoint);
        try {
            InputStream stream = new FileInputStream(path.toString());
            samHq.updateDecoderSession(stream);
        } catch (FileNotFoundException e) {
            throw new RuntimeException(e);
        }
    }
}
