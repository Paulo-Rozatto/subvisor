import { EditPolygon } from "./tools/edit-polygon";
import { MOUSE } from "../utils";
import { PredictTool } from "./tools/predict-tool";
import { ClassesHandler as classes } from "../handlers/classes-handler";
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

const toolEditButton = document.querySelector("#tool-edit-button");
const toolPredictButton = document.querySelector("#tool-predict-button");
const subtoolPointsButton = document.querySelector("#subtool-points");
const subtoolBoxButton = document.querySelector("#subtool-box");
const subtoolGroup = document.querySelector("#subtools-group");

const editPolyTool = new EditPolygon(renderer, hist);
const predictTool = new PredictTool(renderer);

let activeTool = null;
let activeEl = null;

let activeSubTool = predictTool.usePoints;
let activeSubEl = subtoolPointsButton;

function activateTool(tool, el) {
    if (tool === activeTool) {
        return;
    }

    activeTool?.deactivate();
    activeTool = tool;
    tool.activate();

    el?.classList.add("btn-selected");
    activeEl?.classList.remove("btn-selected");
    activeEl = el;

    if (tool === predictTool) {
        subtoolGroup.classList.remove("hide");
    } else {
        subtoolGroup.classList.add("hide");
    }
}

function activateSubTool(subTool, el) {
    if (activeTool !== predictTool) {
        return;
    }

    if (subTool === activeSubTool) {
        return;
    }

    activeSubTool = subTool;
    subTool();

    el?.classList.add("btn-selected");
    activeSubEl?.classList.remove("btn-selected");
    activeSubEl = el;
}

toolEditButton.addEventListener("click", () =>
    activateTool(editPolyTool, toolEditButton)
);
toolPredictButton.addEventListener("click", () =>
    activateTool(predictTool, toolPredictButton)
);

subtoolPointsButton.addEventListener("click", () =>
    activateSubTool(predictTool.usePoints, subtoolPointsButton)
);

subtoolBoxButton.addEventListener("click", () =>
    activateSubTool(predictTool.useBox, subtoolBoxButton)
);

activateTool(editPolyTool, toolEditButton);

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
            classes.current = "";
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
