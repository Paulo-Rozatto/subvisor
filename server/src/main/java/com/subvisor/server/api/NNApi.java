package com.subvisor.server.api;

import com.subvisor.server.models.Contour;
import com.subvisor.server.neuralnetwork.SamHq;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Paths;

import static com.subvisor.server.App.DATA_DIR_PATH;

@RestController
@RequestMapping("/api/nn")
@CrossOrigin(origins = "http://localhost:1234")
public class NNApi {

    final private SamHq samHq = new SamHq();

    @GetMapping("/predict")
    public Contour predict(String path, String points, String labels) {
        String imagePath = Paths.get(DATA_DIR_PATH, "datasets", path).toString();
        String result = samHq.run(imagePath, points, labels);
        return new Contour(result);
    }
}
