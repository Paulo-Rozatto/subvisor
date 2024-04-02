import { IMAGE_MAP } from "../app/app";
import JSZip from "jszip";
import { DefaultParser as parser } from "../app/default-parser";
import saveAs from "file-saver";

const exportButton = document.querySelector("#export-button");

async function download() {
    const zip = new JSZip();

    const leafName = document.querySelector("#title").innerText;
    const folder = zip.folder("annotations");

    for (const imgName in IMAGE_MAP) {
        const img = IMAGE_MAP[imgName];
        const xmlName = imgName.replace(".jpg", ".xml");

        const xml = parser.annotationsToXml(leafName, imgName, img.annotations);
        folder.file(xmlName, xml);
    }

    const cocoFolder = zip.folder("coco");
    const coco = parser.annotationsToCoco(leafName, IMAGE_MAP);
    cocoFolder.file(leafName + "-coco.json", coco);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${leafName}.zip`);
}

exportButton.addEventListener("click", download);
