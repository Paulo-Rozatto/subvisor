package com.subvisor.server.process;

import lombok.val;
import org.apache.commons.io.IOUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;

public class PythonRun {
  private static final String PYTHON_PATH = "/home/paulo/Desktop/tcc/sam-hq/sam_venv/bin/python";
  private static final String SCRIPT_PATH = "/home/paulo/Desktop/tcc/sam-hq/demo/java_test.py";
  private static final String IMG_FOLDER_PATH = "/home/paulo/Desktop/ic/imagens/301-315";

  public static String runNetwork(String path, String points) {
    try {
      val imagePath = Paths.get(IMG_FOLDER_PATH, path).toString();
      ProcessBuilder processBuilder = new ProcessBuilder(PYTHON_PATH, SCRIPT_PATH, imagePath, points);
      processBuilder.redirectErrorStream(true);

      Process process = processBuilder.start();
      String results = IOUtils.toString(process.getInputStream(), StandardCharsets.UTF_8);

      int exitCode = process.waitFor();

      return results;
    } catch (Exception e) {
      System.out.println(e.toString());
      return null;
    }
  }
}
