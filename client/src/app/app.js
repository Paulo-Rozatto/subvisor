import { MOUSE } from "../utils";
import { Renderer as renderer } from "./renderer";

const serverUrl = "http://localhost:8080";

let currentImage;

export const IMAGE_MAP = {};

export async function loadBackendImage(path, imageName, cb = () => {}) {
    const img = IMAGE_MAP[imageName];
    const src = `${serverUrl}/datasets/${path}/${imageName}`;
    currentImage = imageName;
    // selectionIndexes.length = 0;

    renderer.setImage({ src });
    if (img) {
        return;
    }
}

export function getObjectLength() {
    return 0;
}

function onMouseMove(event) {
    if (event.buttons === MOUSE.right) {
        renderer.pan(event.movementX, event.movementY);
    }
}

renderer.addEventListener("mousemove", onMouseMove);

renderer.resetCanvas();
