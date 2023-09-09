package com.subvisor.server.process;

import org.apache.commons.io.IOUtils;

import java.nio.charset.StandardCharsets;

public class PythonRun {
  private static final String PYTHON_PATH = "/home/paulo/Desktop/tcc/sam-hq/sam_venv/bin/python";
  private static final String SCRIPT_PATH = "/home/paulo/Desktop/tcc/sam-hq/demo/java_test.py";

  public static String runNetwork() {
    try {
      ProcessBuilder processBuilder = new ProcessBuilder(PYTHON_PATH, SCRIPT_PATH);
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
