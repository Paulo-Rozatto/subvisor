package com.subvisor.server.neuralnetwork;

import ai.onnxruntime.*;
import com.subvisor.server.models.EmbeddingPair;

import java.io.*;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class Embeddings {
    final private static Map<String, EmbeddingPair> embeddingMap = new HashMap<>();
    final private static long[] imageShape = {1, 256, 64, 64};
    final private static long[] intermShape = {4, 1, 64, 64, 768};

    public static void clearCache() {
        for (EmbeddingPair pair : embeddingMap.values()) {
            pair.imageEmbedding().close();
            pair.intermEmbedding().close();
        }
        embeddingMap.clear();
    }

    public static void save(String imagePath, OnnxTensor imageEmbeddings, OnnxTensor intermEmbeddings, OrtEnvironment env) {
        try {
            imageEmbeddings = OnnxTensor.createTensor(env, imageEmbeddings.getFloatBuffer(), imageShape);
            intermEmbeddings = OnnxTensor.createTensor(env, intermEmbeddings.getFloatBuffer(), intermShape);
            embeddingMap.put(imagePath, new EmbeddingPair(imageEmbeddings, intermEmbeddings));
        } catch (OrtException e) {
            throw new RuntimeException(e);
        }

        String imageEmbedPath = imagePath.replace("datasets", "embeddings").replace(".jpg", ".emb");

        try (FileOutputStream fileOutputStream = new FileOutputStream(imageEmbedPath)) {
            Files.createDirectories(Path.of(imageEmbedPath).getParent());
            fileOutputStream.write(imageEmbeddings.getByteBuffer().array());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        try (FileOutputStream fileOutputStream = new FileOutputStream(imageEmbedPath, true)) {
            fileOutputStream.write(intermEmbeddings.getByteBuffer().array());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public static Optional<EmbeddingPair> retrieve(String imagePath, OrtEnvironment env) {
        if (embeddingMap.containsKey(imagePath)) {
            return Optional.of(embeddingMap.get(imagePath));
        }

        String filePath = imagePath.replace("datasets", "embeddings").replace("jpg", "emb");
        File file = new File(filePath);

        if (!file.exists() || file.isDirectory()) {
            return Optional.empty();
        }

        try (FileInputStream fileInputStream = new FileInputStream(file)) {
            byte[] imageBytes = new byte[4 * 256 * 64 * 64];
            byte[] intermBytes = new byte[4 * 4 * 64 * 64 * 768];

            fileInputStream.read(imageBytes);
            fileInputStream.read(intermBytes);

            OnnxTensor image = OnnxTensor.createTensor(env, ByteBuffer.wrap(imageBytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer(), imageShape);
            OnnxTensor interm = OnnxTensor.createTensor(env, ByteBuffer.wrap(intermBytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer(), intermShape);

            EmbeddingPair pair = new EmbeddingPair(image, interm);
            embeddingMap.put(imagePath, pair);
            return Optional.of(pair);

        } catch (IOException | OrtException e) {
            throw new RuntimeException(e);
        }
    }

}
