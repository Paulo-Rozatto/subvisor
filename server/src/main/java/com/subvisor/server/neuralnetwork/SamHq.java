package com.subvisor.server.neuralnetwork;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtException;
import ai.onnxruntime.OrtSession;
import com.subvisor.server.models.EmbeddingPair;
import lombok.extern.slf4j.Slf4j;
import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;

import java.io.IOException;
import java.nio.FloatBuffer;
import java.util.*;

import static org.opencv.core.CvType.CV_32F;
import static org.opencv.core.CvType.CV_8UC1;

@Slf4j
public class SamHq {
    final private OrtEnvironment env;
    final private OrtSession session;
    final private OrtSession decoderSession;

    public SamHq() {
        try {
            byte[] encoder = Objects.requireNonNull(getClass().getResourceAsStream("/models/encoder.onnx")).readAllBytes();
            byte[] decoder = Objects.requireNonNull(getClass().getResourceAsStream("/models/decoder.onnx")).readAllBytes();

            env = OrtEnvironment.getEnvironment();
            session = env.createSession(encoder, new OrtSession.SessionOptions());
            decoderSession = env.createSession(decoder, new OrtSession.SessionOptions());
        } catch (IOException | NullPointerException | OrtException e) {
            throw new RuntimeException(e);
        }
    }

    public String run(String imagePath, String points, String labels) {
        Mat imageMat = Imgcodecs.imread(imagePath);
        float[] pointsArray = str2array(points + ",0,0");
        float[] labelsArray = str2array(labels + ",-1");

        float[] originalSize = {imageMat.rows(), imageMat.cols()};
        float scale = 1024 / (float) Math.max(imageMat.rows(), imageMat.cols());
        resize(imageMat, scale);


        try {
            float[] inputSize = {imageMat.rows(), imageMat.cols()};

            OnnxTensor imageEmbeddings;
            OnnxTensor intermEmbeddings;
            OrtSession.Result enconderResult = null;
            Optional<EmbeddingPair> optional = Embeddings.retrieve(imagePath, env);

            if (optional.isPresent()) {
                EmbeddingPair pair = optional.get();
                imageEmbeddings = pair.imageEmbedding();
                intermEmbeddings = pair.intermEmbedding();
            } else {
                enconderResult = encode(imageMat);
                imageEmbeddings = ((OnnxTensor) enconderResult.get("image_embeddings").get());
                intermEmbeddings = (OnnxTensor) enconderResult.get("interm_embeddings").get();

                Embeddings.save(imagePath, imageEmbeddings, intermEmbeddings, env);
            }

            OrtSession.Result decoderResult = decode(imageEmbeddings, intermEmbeddings, pointsArray, scale, labelsArray, inputSize);

            Mat mask = new Mat((int) inputSize[0], (int) inputSize[1], CV_8UC1);
            float[][] output = ((float[][][][]) decoderResult.get("masks").get().getValue())[0][0];

            int rows = (int) inputSize[0];
            int cols = (int) inputSize[1];
            for (int i = 0; i < rows; i++) {
                for (int j = 0; j < cols; j++) {
                    int value = output[i][j] > 0 ? 1 : 0;
                    mask.put(i, j, value);
                }
            }

            List<MatOfPoint> contours = new ArrayList<>();
            Mat hierarchy = new Mat();
            Imgproc.findContours(mask, contours, hierarchy, Imgproc.RETR_TREE, Imgproc.CHAIN_APPROX_SIMPLE);

            double maxVal = 0;
            int maxValIdx = 0;
            for (int contourIdx = 0; contourIdx < contours.size(); contourIdx++) {
                double contourArea = Imgproc.contourArea(contours.get(contourIdx));
                if (maxVal < contourArea) {
                    maxVal = contourArea;
                    maxValIdx = contourIdx;
                }
            }

            MatOfPoint2f polyPoints = new MatOfPoint2f(contours.get(maxValIdx).toArray());
            double peri = Imgproc.arcLength(polyPoints, true);
            Imgproc.approxPolyDP(polyPoints, polyPoints, 0.0006 * peri, true);

            StringBuilder stringArray = new StringBuilder("[");
            String x, y;
            double xRatio = originalSize[0] / inputSize[0];
            double yRatio = originalSize[1] / inputSize[1];
            for (Point p : polyPoints.toArray()) {
                x = String.valueOf(p.x * xRatio);
                y = String.valueOf(p.y * yRatio);
                stringArray.append(String.format("[%s, %s],", x, y));
            }
            stringArray.replace(stringArray.length() - 1, stringArray.length(), "]");

            if (enconderResult != null) {
                enconderResult.close();
            }
            decoderResult.close();

            return stringArray.toString();

        } catch (OrtException e) {
            throw new RuntimeException(e);
        }

    }

    private OrtSession.Result encode(Mat imageMat) throws OrtException {
        float[] floatData = new float[imageMat.rows() * imageMat.cols() * imageMat.channels()];
        imageMat.convertTo(imageMat, CV_32F);
        imageMat.get(0, 0, floatData);

        // Create OnnxTensor
        long[] shape = {imageMat.rows(), imageMat.cols(), imageMat.channels()};
        OnnxTensor imageTensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(floatData), shape);

        return session.run(Collections.singletonMap("input_image", imageTensor));
    }

    private OrtSession.Result decode(OnnxTensor imageEmbeddings, OnnxTensor intermEmbeddings, float[] points, float scale, float[] labels, float[] inputSize) throws OrtException {
        float[] mask = new float[256 * 256];
        float[] hasMask = {0.0f};

        long[] pointsShape = {1, points.length / 2, 2};
        long[] labelsShape = {1, pointsShape[1]};
        long[] maskShape = {1, 1, 256, 256};
        long[] hasMaskShape = {1};
        long[] sizeShape = {2};


        for (int i = 0; i < points.length; i++) {
            points[i] *= scale;
        }

        OnnxTensor pointsCoords = OnnxTensor.createTensor(env, FloatBuffer.wrap(points), pointsShape);
        OnnxTensor pointsLabels = OnnxTensor.createTensor(env, FloatBuffer.wrap(labels), labelsShape);
        OnnxTensor maskInput = OnnxTensor.createTensor(env, FloatBuffer.wrap(mask), maskShape);
        OnnxTensor hasMaskInput = OnnxTensor.createTensor(env, FloatBuffer.wrap(hasMask), hasMaskShape);
        OnnxTensor origImSize = OnnxTensor.createTensor(env, FloatBuffer.wrap(inputSize), sizeShape);

        return decoderSession.run(Map.of(
                "image_embeddings", imageEmbeddings,
                "interm_embeddings", intermEmbeddings,
                "point_coords", pointsCoords,
                "point_labels", pointsLabels,
                "mask_input", maskInput,
                "has_mask_input", hasMaskInput,
                "orig_im_size", origImSize
        ));

    }

    private float[] str2array(String dataPoints) {
        String[] stringPts = dataPoints.split(",");
        float[] pts = new float[stringPts.length];

        for (int i = 0; i < stringPts.length; i++) {
            pts[i] = Float.parseFloat(stringPts[i]);
        }
        return pts;
    }

    private void resize(Mat imageMat, float scale) {
        Size newSize = new Size(
                (int) (imageMat.cols() * scale + 0.5),
                (int) (imageMat.rows() * scale + 0.5)
        );
        int interpolation = scale < 1 ? Imgproc.INTER_AREA : Imgproc.INTER_CUBIC;
        Imgproc.resize(imageMat, imageMat, newSize, 0, 0, interpolation);
    }
}
