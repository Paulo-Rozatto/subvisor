package com.subvisor.server;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.val;

@SpringBootApplication
public class App implements WebMvcConfigurer {
	public static String DATA_DIR_PATH;

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		val datasetPath = Paths.get(DATA_DIR_PATH, "datasets").toString();

		System.out.println(datasetPath);
		registry.addResourceHandler("/datasets/**")
				.addResourceLocations("file:" + datasetPath + "/")
				.setCachePeriod(0);
	}

	private static String getOrCreateDataDirs() {
		val homePath = System.getProperty("user.home");
		val rootDataDir = Paths.get(homePath, "subvisor").toString();
		val datasetsDir = Paths.get(rootDataDir, "datasets");

		try {
			Files.createDirectories(datasetsDir);
			return rootDataDir;
		} catch (IOException e) {
			throw new RuntimeException(e);
		}
	}

	public static void main(String[] args) {
		DATA_DIR_PATH = getOrCreateDataDirs();
		SpringApplication.run(App.class, args);
	}

}
