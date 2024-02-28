import { MOUSE } from "../utils";
import { ActionHistory as hist } from "./action-history";
import { DefaultParser as parser } from "./default-parser";
import { Renderer as renderer } from "./renderer";

export const IMAGE_MAP = {};

export async function loadImage(fileEntry, marker, leaf, callback) {
    const img = IMAGE_MAP[fileEntry.name];

    if (img) {
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
            callback();
        };
        reader.readAsDataURL(file);
    });
}

export async function loadBackendImage(path, imageName, callback) {
    const img = IMAGE_MAP[imageName];

    if (img) {
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

/* -- EVENTS CALLBACKS -- */

function onPointerMove(event) {
    // pan image if right button is clicked
    if (event.buttons === MOUSE.right) {
        renderer.pan(event.movementX, event.movementY);
        return;
    }

    if (!renderer.showAnnotations) {
        return;
    }

    renderer.render();
}

export function onKeyDown(event) {
    const key = event.key.toLowerCase();

    if (event.ctrlKey) {
        switch (key) {
            case "z": {
                renderer.selection.clear();
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
        case "escape": {
            renderer.focused = null;
            renderer.hovered = null;
            renderer.showRoi = false;
            renderer.render();
            break;
        }

        case "c": {
            renderer.centerFocus();
            break;
        }

        case "b": {
            renderer.showAnnotations = !renderer.showAnnotations;
            renderer.render();
        }
    }
}

/* -- RENDERER EVENTS ASSIGNEMENT -- */

renderer.addEventListener("pointermove", onPointerMove);
renderer.addEventListener("keydown", onKeyDown);

renderer.reset();
