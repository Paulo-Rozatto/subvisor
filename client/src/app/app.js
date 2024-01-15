import { MOUSE, l1Distance, pointToSegment } from "../utils";
import { ClassesHandler as classes } from "../handlers/classes-handler";
import { DefaultParser as parser } from "./default-parser";
import { Renderer as renderer } from "./renderer";

export const IMAGE_MAP = {};

let currentImage = null;

export async function loadBackendImage(path, imageName) {
    const img = IMAGE_MAP[imageName];

    if (img) {
        currentImage = img;
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

function highlightHover(mouse) {
    const annotation = renderer.focused;
    if (!annotation) {
        return;
    }

    let point;
    for (let i = 0; i < annotation.points.length; i++) {
        point = renderer.toCanvasCoords(
            annotation.points[i].x,
            annotation.points[i].y
        );

        if (l1Distance(mouse, point) < 10) {
            renderer.setCursor("pointer");
            renderer.hovered = annotation.points[i];
            return;
        }
    }

    renderer.setCursor("default");
    renderer.hovered = null;
}

/* -- EVENTS CALLBACKS -- */

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
    // pan image if right button is clicked
    if (event.buttons === MOUSE.right) {
        renderer.pan(event.movementX, event.movementY);
        return;
    }

    // if there's a point clicked it's hovered and should be moved, otherwise check hovering
    if (event.buttons === MOUSE.left && renderer.hovered) {
        renderer.hovered.x += event.movementX / renderer.zoomLevel;
        renderer.hovered.y += event.movementY / renderer.zoomLevel;
    } else {
        highlightHover({ x: event.offsetX, y: event.offsetY });
    }

    renderer.render();
}

renderer.addEventListener("click", onClick);
renderer.addEventListener("mousemove", onMouseMove);

renderer.resetCanvas();
