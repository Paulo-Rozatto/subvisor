import { IMAGE_LIST } from "../app";
import JSZip from "jszip";
import { DefaultParser as parser } from "../app/default-parser";
import saveAs from "file-saver";

const exportButton = document.querySelector("#export-button");

async function download() {
    const zip = new JSZip();

    const leafName = document.querySelector("#title").innerText;
    const folder = zip.folder("annotations");

    for (const image of IMAGE_LIST) {
        const xmlName = image.name.replace(/(\.\w+)$/, ".xml");

        console.log(image.annotations);
        const xml = parser.annotationsToXml(
            leafName,
            image.name,
            image.annotations
        );
        folder.file(xmlName, xml);
    }

    const cocoFolder = zip.folder("coco");
    const coco = parser.annotationsToCoco(leafName, IMAGE_LIST);
    cocoFolder.file(leafName + "-coco.json", coco);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${leafName}.zip`);
}

exportButton.addEventListener("click", download);
