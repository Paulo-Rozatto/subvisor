package com.subvisor.server.models;

public record ConfigUpdateMessage(String path, String configString) {
}
