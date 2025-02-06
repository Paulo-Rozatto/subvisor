package com.subvisor.server.models;

import java.util.List;

public record CheckpointsInfo(String currentCheckpoint, List<String> checkpointList) {
}
