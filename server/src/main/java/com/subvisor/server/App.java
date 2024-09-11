package com.subvisor.server;

import nu.pattern.OpenCV;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@SpringBootApplication
public class App implements WebMvcConfigurer {
    public static String DATA_DIR_PATH;

    private static String getOrCreateDataDirs() {
        final String homePath = System.getProperty("user.home");
        final String rootDataDir = Paths.get(homePath, "subvisor").toString();
        final Path datasetsDir = Paths.get(rootDataDir, "datasets");
        final Path checkpointsDir = Paths.get(rootDataDir, "checkpoints");

        try {
            Files.createDirectories(datasetsDir);
            Files.createDirectories(checkpointsDir);
            return rootDataDir;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public static void main(String[] args) {
        OpenCV.loadLocally();

        DATA_DIR_PATH = getOrCreateDataDirs();

        SpringApplication.run(App.class, args);
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
