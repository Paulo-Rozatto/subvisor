package com.subvisor.server;

import lombok.extern.slf4j.Slf4j;
import nu.pattern.OpenCV;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.awt.*;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@SpringBootApplication
@Slf4j
public class App implements WebMvcConfigurer {
    public static String DATA_DIR_PATH;

    private static String getOrCreateDataDirs() {
        final String homePath = System.getProperty("user.home");
        final String rootDataDir = Paths.get(homePath, "subvisor").toString();
        final Path datasetsDir = Paths.get(rootDataDir, "datasets");
        final Path checkpointsDir = Paths.get(rootDataDir, "checkpoints");
        final Path logsDir = Paths.get(rootDataDir, "logs");

        try {
            Files.createDirectories(datasetsDir);
            Files.createDirectories(checkpointsDir);
            Files.createDirectories(logsDir);
            return rootDataDir;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public static void main(String[] args) {
        OpenCV.loadLocally();

        DATA_DIR_PATH = getOrCreateDataDirs();

        System.setProperty("LOG_DIR", DATA_DIR_PATH + "/logs/");

        SpringApplication.run(App.class, args);

        String url = "http://localhost:8080/";
        log.info("App running at {}", url);

        try {
            if (Desktop.isDesktopSupported()) {
                Desktop.getDesktop().browse(new URI(url));
                log.info("Opened browser at: {}", url);
            }
        } catch (Exception e) {
            log.error("Failed to open browser.", e);
        }
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String datasetPath = Paths.get(DATA_DIR_PATH, "datasets").toString();

        System.out.println(datasetPath);
        registry.addResourceHandler("/datasets/**")
                .addResourceLocations("file:" + datasetPath + "/")
                .setCachePeriod(0);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*");
    }

}
