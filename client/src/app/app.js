import { MOUSE, l1Distance, pointToSegment } from "../utils";
import { ClassesHandler as classes } from "../handlers/classes-handler";
import { ActionHistory as hist } from "./action-history";
import { DefaultParser as parser } from "./default-parser";
import { Renderer as renderer } from "./renderer";

export const IMAGE_MAP = {};

let currentImage = null;

// movement auxiliaries
const moveStart = { x: 0, y: 0 };
let canMove = false;
let hasMoved = false;

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
    hist.push("add", renderer.focused, newPoint, index + 1);
    renderer.render();
}

function rmPoint(point) {
    if (!point || !renderer.focused) {
        return;
    }

    const index = renderer.focused.points.indexOf(point);
    const points = renderer.focused.points.splice(index, 1);
    renderer.hovered = null;
    hist.push("rm", renderer.focused, points[0], index);
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

function onPointerDown(event) {
    if (event.buttons !== MOUSE.left) {
        return;
    }

    // if clicked hovered,
    if (renderer.hovered) {
        moveStart.x = renderer.hovered.x;
        moveStart.y = renderer.hovered.y;
        canMove = true;
        return;
    }

    // select an annotation
    for (const ann of currentImage.annotations) {
        if (
            ann.path &&
            renderer.focused !== ann &&
            renderer.context.isPointInPath(
                ann.path,
                event.offsetX,
                event.offsetY
            )
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

function onPointerMove(event) {
    // pan image if right button is clicked
    if (event.buttons === MOUSE.right) {
        renderer.pan(event.movementX, event.movementY);
        return;
    }

    // if there's a point clicked it's hovered and should be moved, otherwise check hovering
    if (canMove && renderer.hovered) {
        renderer.hovered.x += event.movementX / renderer.zoomLevel;
        renderer.hovered.y += event.movementY / renderer.zoomLevel;
        hasMoved = true;
    } else {
        highlightHover({ x: event.offsetX, y: event.offsetY });
    }

    renderer.render();
}

function onPointerUp() {
    if (hasMoved) {
        hist.push("mv", renderer.focused, renderer.hovered, { ...moveStart });
    }

    canMove = hasMoved = false;
}

export function onKeyDown(event) {
    const key = event.key.toLowerCase();

    if (event.ctrlKey) {
        switch (key) {
            case "z": {
                hist.undo();
                break;
            }
            case "y": {
                hist.redo();
                break;
            }
        }
        return;
    }

    switch (key) {
        case "backspace":
        case "delete": {
            rmPoint(renderer.hovered);
            break;
        }
    }
}

renderer.addEventListener("pointerdown", onPointerDown);
renderer.addEventListener("pointermove", onPointerMove);
renderer.addEventListener("pointerup", onPointerUp);
renderer.addEventListener("keydown", onKeyDown);

renderer.resetCanvas();
