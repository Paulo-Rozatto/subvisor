import { MOUSE } from "../utils";
import { DefaultParser as parser } from "./default-parser";
import { Renderer as renderer } from "./renderer";

export const IMAGE_MAP = {};

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

    IMAGE_MAP[imageName] = image;
    renderer.setImage(image);
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
