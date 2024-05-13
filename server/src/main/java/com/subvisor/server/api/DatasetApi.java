package com.subvisor.server.api;

import com.subvisor.server.App;
import com.subvisor.server.models.ConfigUpdateMessage;
import com.subvisor.server.models.DatasetInfo;
import com.subvisor.server.neuralnetwork.Embeddings;
import org.apache.commons.io.FileUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/datasets")
@CrossOrigin(origins = "http://localhost:1234")
public class DatasetApi {
    private static final Path DATASETS_PATH = Paths.get(App.DATA_DIR_PATH, "datasets");
    private static final String PATH_REGEX = "{path:(?:\\w/?)+}";

    @GetMapping("/list")
    public List<String> listDatasetDirs() {
        String path = DATASETS_PATH.toString();
        File[] dirs = new File(path).listFiles(File::isDirectory);

        if (dirs == null) {
            return new ArrayList<>();
        }

        return Arrays.stream(dirs)
                .map(File::getName)
                .sorted()
                .collect(Collectors.toList());
    }

    @GetMapping("/dir")
    public List<String> getDataset(@RequestParam String path) {
        String realPath = Paths.get(DATASETS_PATH.toString(), path).toString();
        File[] dirs = new File(realPath).listFiles(File::isDirectory);

        if (dirs == null) {
            return new ArrayList<>();
        }

        return Arrays.stream(dirs)
                .map((file) -> DATASETS_PATH.relativize(file.toPath()).toString())
                .sorted()
                .collect(Collectors.toList());
    }

    @GetMapping("/dataset-info")
    public DatasetInfo getImageList(@RequestParam String path) {
        String realPath = Paths.get(DATASETS_PATH.toString(), path).toString();
        File[] images = new File(realPath).listFiles(file -> file.getName().endsWith(".jpg"));

        if (images == null) {
            return null;
        }

        List<String> imagesList = Arrays.stream(images)
                .map(File::getName)
                .sorted()
                .toList();

        String rootPath = Paths.get(path).getName(0).toString();
        String configPath = Paths.get(DATASETS_PATH.toString(), rootPath, "config.json").toString();
        File configFile = new File(configPath);
        String configs = "";

        if (configFile.isFile() && !configFile.isDirectory()) {
            try {
                configs = FileUtils.readFileToString(configFile, "utf-8");
            } catch (IOException e) {
                throw new RuntimeException("Couldn't find config file: " + configPath);
            }
        }

        Embeddings.clearCache();

        return new DatasetInfo(configs, imagesList);
    }

    // todo: the file content should actually be only the points, whe should make the file formatting in the backend
    @PostMapping("/save-annotation")
    public void saveAnnotation(@RequestBody Map<String, String> payload) {
        // todo: change it to a class or serializer
        String path = payload.get("path");
        String className = payload.get("className");
        String fileName = payload.get("fileName");
        String fileContent = payload.get("fileContent");
        // can it be exploited?
        Path dirPath = Paths.get(DATASETS_PATH.toString(), path, className);
        try {
            Files.createDirectories(dirPath);
            File file = new File(dirPath + "/" + fileName);
            FileWriter fw = new FileWriter(file.getAbsoluteFile());
            BufferedWriter bw = new BufferedWriter(fw);
            bw.write(fileContent);
            bw.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }

    @PostMapping("/save-config")
    public void saveConfig(@RequestBody ConfigUpdateMessage payload) {
        String rootPath = Paths.get(payload.path()).getName(0).toString();
        String configPath = Paths.get(DATASETS_PATH.toString(), rootPath, "config.json").toString();
        File configFile = new File(configPath);

        try {
            FileUtils.writeStringToFile(configFile, payload.configString(), "utf-8");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
