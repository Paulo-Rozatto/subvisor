import * as cocoParser from "../parsers/coco";
import * as defaultParser from "../parsers/default";

import { EXTENSION_REGEX } from "../utils";
import { IMAGE_LIST } from "../app";
import JSZip from "jszip";
import saveAs from "file-saver";

const exportButton = document.querySelector("#export-button");

async function download() {
    const zip = new JSZip();

    const leafName = document.querySelector("#title").innerText;
    const folder = zip.folder("annotations");

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

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${leafName}.zip`);
}

exportButton.addEventListener("click", download);
