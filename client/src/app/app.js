import { MOUSE, pointToSegment } from "../utils";
import { ClassesHandler as classes } from "../handlers/classes-handler";
import { DefaultParser as parser } from "./default-parser";
import { Renderer as renderer } from "./renderer";

export const IMAGE_MAP = {};

let currentImage = null;

export async function loadBackendImage(path, imageName) {
    const img = IMAGE_MAP[imageName];

    if (img) {
        renderer.setImage(img);
        return;
    }

    if (!(path || imageName)) {
        console.error(`ERRO: faltando caminho o nome da imagem`, {
            path,
            imageName,
        });
        return;
    }

    const image = await parser.parseBeanLeaf(path, imageName);

    if (!image) {
        console.error(`Can't load image ${path}`);
        return;
    }

    currentImage = image;
    IMAGE_MAP[imageName] = image;
    renderer.setImage(image);
}

export function getObjectLength() {
    return 0;
}

function addPoint(annotation, x, y) {
    const limit = classes[annotation.class].points.limit;
    const points = annotation.points;

    if (limit && points.length >= limit) {
        return;
    }

    const newPoint = renderer.fromCanvasCoords(x, y);

    // se tem menos de 3 pontos, se pode apenas colocar o novo ponto no final
    if (points < 3) {
        points.push(newPoint);
        renderer.render();
        return;
    }

    // othewise we have to find the nearest segment
    let closer = pointToSegment(newPoint, points[0], points[points.length - 1]);
    let index = points.length - 1;
    let distance;

    for (let i = 0; i < points.length - 1; i++) {
        distance = pointToSegment(newPoint, points[i], points[i + 1]);

        if (distance < closer) {
            closer = distance;
            index = i;
        }
    }

    points.splice(index + 1, 0, newPoint);
    renderer.render();
}

function onClick(event) {
    const ctx = renderer.context;

    // select an annotation
    for (const ann of currentImage.annotations) {
        if (
            Boolean(ann.path) &&
            ctx.isPointInPath(ann.path, event.offsetX, event.offsetY)
        ) {
            renderer.focused = ann;
            renderer.render();
            return;
        }
    }

    // nothing to do if there is no focused annotation
    if (!renderer.focused) {
        return;
    }

    // add point if allowed
    addPoint(renderer.focused, event.offsetX, event.offsetY);
}

function onMouseMove(event) {
    if (event.buttons === MOUSE.right) {
        renderer.pan(event.movementX, event.movementY);
        return;
    }
}

renderer.addEventListener("click", onClick);
renderer.addEventListener("mousemove", onMouseMove);

renderer.resetCanvas();
