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

// prediction auxiliaries
let usingRoi = false;
let clickedRoi = false;
let canMoveRoi = false;

export async function loadImage(fileEntry, marker, leaf, callback) {
    const img = IMAGE_MAP[fileEntry.name];
    currentImage = fileEntry.name;

    renderer.focused = null;
    renderer.showRoi = false;
    usingRoi = false;

    if (img) {
        currentImage = img;
        renderer.setImage(img);
        callback();
        return;
    }

    // todo: that mess below should be revised and probably replaced in default-parser.js
    const markerPoints = !marker
        ? []
        : await parser.pointsFromEntry(marker, "corners");
    const leafPoints = !leaf
        ? []
        : await parser.pointsFromEntry(leaf, "points");

    const filePath = fileEntry.fullPath;
    fileEntry.file((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const image = {
                src: event.target.result,
                annotations: [
                    { class: "marker", points: markerPoints },
                    { class: "leaf", points: leafPoints },
                ],
                filePath,
            };
            IMAGE_MAP[fileEntry.name] = image;
            renderer.setImage(image);
            currentImage = image;
            callback();
        };
        reader.readAsDataURL(file);
    });
}

export async function loadBackendImage(path, imageName, callback) {
    const img = IMAGE_MAP[imageName];

    renderer.focused = null;
    renderer.showRoi = false;
    usingRoi = false;

    if (img) {
        currentImage = img;
        renderer.setImage(img);
        callback();
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
    callback();
}

export function getObjectLength() {
    if (renderer.focused) {
        return renderer.focused.points.length;
    }
    return 0;
}

/* -- MAIN INTERACTION FUNCTIONS -- */

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
    renderer.selection.toggle(newPoint);
    renderer.render();
}

function rmPoint() {
    if (!renderer.focused) {
        return;
    }

    // remove selection
    if (renderer.selection.length > 0) {
        for (const point of renderer.selection) {
            const index = renderer.focused.points.indexOf(point);
            const points = renderer.focused.points.splice(index, 1);
            hist.push("rm", renderer.focused, points[0], index);
        }
        renderer.selection.unselect();
        renderer.render();
        return;
    }

    // if there's no selection, remove hover
    if (!renderer.hovered) {
        return;
    }

    const index = renderer.focused.points.indexOf(renderer.hovered);
    const points = renderer.focused.points.splice(index, 1);
    renderer.hovered = null;
    hist.push("rm", renderer.focused, points[0], index);
    renderer.render();
}

function highlightHover(mouse) {
    // hover over the annoataion points or over the roi box
    const points = renderer.focused
        ? renderer.focused.points
        : renderer.showRoi
          ? renderer.roi.points
          : null;

    if (!points) {
        return;
    }

    let point;
    for (let i = 0; i < points.length; i++) {
        point = renderer.toCanvasCoords(points[i].x, points[i].y);

        if (l1Distance(mouse, point) < 10) {
            renderer.setCursor("pointer");
            renderer.hovered = points[i];
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

    clickedRoi = false;

    // if clicked hovered,
    if (renderer.hovered) {
        moveStart.x = renderer.hovered.x;
        moveStart.y = renderer.hovered.y;
        canMove = true;

        if (event.shiftKey) {
            renderer.selection.pathTo(
                renderer.hovered,
                renderer.focused.points
            );
            renderer.render();
            return;
        }

        renderer.selection.toggle(renderer.hovered);
        renderer.render();
        return;
    }

    // check if clicked on roi, that info is used in double clicked event
    if (
        renderer.showRoi &&
        renderer.roi.path &&
        renderer.context.isPointInPath(
            renderer.roi.path,
            event.offsetX,
            event.offsetY
        )
    ) {
        clickedRoi = true;
        canMoveRoi = true;
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
            renderer.showRoi = false;
            usingRoi = false;
            renderer.render();
            return;
        }
    }

    // if some anotation is focused, add point
    if (renderer.focused) {
        // add point if allowed
        addPoint(renderer.focused, event.offsetX, event.offsetY);
        return;
    }

    // otherwise start roi
    const point = renderer.fromCanvasCoords(event.offsetX, event.offsetY);
    renderer.roi.points[0].x = point.x;
    renderer.roi.points[0].y = point.y;
    renderer.roi.points[1].x = point.x;
    renderer.roi.points[1].y = point.y;
    renderer.showRoi = true;
    renderer.hovered = renderer.roi.points[1];
    canMove = true;
    usingRoi = true;
    renderer.render();
}

function onPointerMove(event) {
    // pan image if right button is clicked
    if (event.buttons === MOUSE.right) {
        renderer.pan(event.movementX, event.movementY);
        return;
    }

    // if there's a point clicked it's hovered and should be moved, otherwise check hovering
    if (canMove && renderer.hovered) {
        const point = renderer.fromCanvasCoords(event.offsetX, event.offsetY);
        renderer.hovered.x = point.x;
        renderer.hovered.y = point.y;
        hasMoved = true;
    } else if (canMoveRoi) {
        renderer.roi.points[0].x += event.movementX / renderer.zoomLevel;
        renderer.roi.points[0].y += event.movementY / renderer.zoomLevel;
        renderer.roi.points[1].x += event.movementX / renderer.zoomLevel;
        renderer.roi.points[1].y += event.movementY / renderer.zoomLevel;
    } else {
        highlightHover({ x: event.offsetX, y: event.offsetY });
    }

    renderer.render();
}

function onPointerUp() {
    if (hasMoved) {
        hist.push("mv", renderer.focused, renderer.hovered, { ...moveStart });
    }

    if (usingRoi) {
        usingRoi = false;
    }

    canMove = hasMoved = canMoveRoi = false;
}

function onDoubleClick() {
    if (clickedRoi) {
        clickedRoi = false;
        classes.predictAnnotation(renderer.roi.points);
    }
}

export function onKeyDown(event) {
    const key = event.key.toLowerCase();

    if (event.ctrlKey) {
        switch (key) {
            case "z": {
                renderer.selection.unselect();
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

        case "escape": {
            renderer.focused = null;
            renderer.showRoi = false;
            usingRoi = false;
            renderer.render();
            break;
        }
    }
}

/* -- RENDERER EVENTS ASSIGNEMENT -- */

renderer.addEventListener("pointerdown", onPointerDown);
renderer.addEventListener("pointermove", onPointerMove);
renderer.addEventListener("pointerup", onPointerUp);
renderer.addEventListener("dblclick", onDoubleClick);
renderer.addEventListener("keydown", onKeyDown);

renderer.resetCanvas();
