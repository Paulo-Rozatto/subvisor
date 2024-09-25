import * as cocoParser from "../parsers/coco";
import * as defaultParser from "../parsers/default";
import * as folhasParser from "../parsers/folhas";

import { EXTENSION_REGEX } from "../utils";
import { IMAGE_LIST } from "../app";
import JSZip from "jszip";
import saveAs from "file-saver";

const exportButton = document.querySelector("#export-button");

async function download() {
    const zip = new JSZip();

    const folders = {};

    const leafName = document.querySelector("#title").innerText;
    let folder = zip.folder("annotations");

    for (const image of IMAGE_LIST) {
        const xmlName = image.name.replace(EXTENSION_REGEX, ".xml");
        const xml = defaultParser.stringify(
            leafName,
            image.name,
            image.annotations
        );
        folder.file(xmlName, xml);
    }

    const cocoFolder = zip.folder("coco");
    const coco = cocoParser.stringify(IMAGE_LIST);
    cocoFolder.file(leafName + "-coco.json", coco);

    for (const image of IMAGE_LIST) {
        const xmlName = image.name.replace(EXTENSION_REGEX, ".xml");

        if (image.annotations.length === 0) {
            continue;
        }

        const xml = folhasParser.stringify(image.name, image.annotations);

        folder = folders[image.folder];
        if (!folder) {
            folder = zip.folder(image.folder);
            folders[image.folder] = folder;
        }

        folder.file(xmlName, xml);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${leafName}.zip`);
}

exportButton.addEventListener("click", download);
