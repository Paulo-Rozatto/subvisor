package com.subvisor.server.models;

import ai.onnxruntime.OnnxTensor;

public record EmbeddingPair(OnnxTensor imageEmbedding, OnnxTensor intermEmbedding) {
}
