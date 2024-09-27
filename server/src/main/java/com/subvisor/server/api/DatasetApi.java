package com.subvisor.server.api;

import com.subvisor.server.App;
import com.subvisor.server.models.ConfigUpdateMessage;
import com.subvisor.server.models.DatasetInfo;
import com.subvisor.server.neuralnetwork.Embeddings;
import org.apache.commons.io.FileUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
import java.util.stream.Stream;

// todo: I have to implement proper logging and handling exceptions and bad requests
// todo: Currently, navigation works in paths and it shouldn't (../), so sanitize paths passed

@RestController
@RequestMapping("/api/datasets")
@CrossOrigin(origins = {"http://localhost:1234", "http://localhost:8080"})
public class DatasetApi {
    private static final Path DATASETS_PATH = Paths.get(App.DATA_DIR_PATH, "datasets");

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

    @GetMapping(value = "/annotation", produces = "application/xml")
    public ResponseEntity<String> getAnnotation(String path, String fileName) {
        try {
            Path realPath = Paths.get(DATASETS_PATH.toString(), path);

            try (Stream<Path> stream = Files.walk(realPath)) {
                Path filePath = stream
                        .filter(Files::isRegularFile)
                        .filter(fp -> fp.getFileName().toString().equals(fileName))
                        .findFirst()
                        .orElse(null);

                if (filePath != null) {
                    String fileContent = new String(Files.readAllBytes(filePath));
                    return ResponseEntity.ok(fileContent);
                } else {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Annotation not found");
                }
            }

        } catch (IOException e) {
            throw new RuntimeException("Error occurred: " + e.getMessage());
        }
    }

    @GetMapping("/dataset-info")
    public DatasetInfo getImageList(@RequestParam String path) {
        String realPath = Paths.get(DATASETS_PATH.toString(), path).toString();
        File[] images = new File(realPath).listFiles(file -> file.getName().matches(".*\\.(?:jpe?g|png|webp)$"));

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

    // todo: should be temporary i think
    @GetMapping("/open")
    public Boolean openDatasetFolder(@RequestParam String path) {
        String folderPath = Paths.get(DATASETS_PATH.toString(), path).toString();
        File file = new File(folderPath);

        if (!file.exists() || !file.isDirectory()) {
            System.out.println("Invalid folder path.");
            return false;
        }

        try {
            String os = System.getProperty("os.name").toLowerCase();

            if (os.contains("win")) {
                // Windows
                Runtime.getRuntime().exec("explorer.exe /select," + folderPath);
            } else if (os.contains("mac")) {
                // macOS
                Runtime.getRuntime().exec("open " + folderPath);
            } else if (os.contains("nix") || os.contains("nux")) {
                // Linux
                Runtime.getRuntime().exec("xdg-open " + folderPath);
            } else {
                System.out.println("Unsupported operating system.");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return true;
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
