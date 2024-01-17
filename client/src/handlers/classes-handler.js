import { annotateLeaf, saveXml } from "../api-consumer";
import { currentPath, selected } from "./dataset-load-handler";
import CLASSES from "../classes.json";
import { IMAGE_MAP } from "../app/app";
import { DefaultParser as parser } from "../app/default-parser";
import { Renderer as renderer } from "../app/renderer";

async function predictAnnotation(points) {
    const fileName = selected.innerText + ".jpg";
    const path = currentPath + "/" + fileName;
    const leafName = document.querySelector("#title").innerText;

    const topLeft = {
        x: Math.min(points[0].x, points[1].x),
        y: Math.min(points[0].y, points[1].y),
    };

    const botttomRight = {
        x: Math.max(points[0].x, points[1].x),
        y: Math.max(points[0].y, points[1].y),
    };

    const newPoints = await annotateLeaf(path, topLeft, botttomRight);

    if (!newPoints) {
        return;
    }

    const ann = IMAGE_MAP[fileName].annotations.find(
        (ann) => ann.class === "leaf"
    );
    ann.points = newPoints;
    const xml = parser.pointsToXml(leafName, fileName, ann);
    renderer.render();
    saveXml(path, "leaf", fileName.replace(".jpg", ".xml"), xml);
}

document.querySelector("#predict-button").addEventListener("click", () => {
    if (renderer.showRoi) {
        predictAnnotation(renderer.roi.points);
    }
});

export const ClassesHandler = {
    ...CLASSES,
    predictAnnotation,
};
