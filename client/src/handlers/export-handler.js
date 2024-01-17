import { IMAGE_MAP } from "../app/app";
import JSZip from "jszip";
import { DefaultParser as parser } from "../app/default-parser";
import saveAs from "file-saver";

const exportButton = document.querySelector("#export-button");

async function download() {
    const zip = new JSZip();

    const leafName = document.querySelector("#title").innerText;

    for (const imgName in IMAGE_MAP) {
        const img = IMAGE_MAP[imgName];
        const xmlName = imgName.replace(".jpg", ".xml");

        for (const annotation of img.annotations) {
            const xml = parser.pointsToXml(leafName, imgName, annotation);
            const folder = zip.folder(annotation.class);
            folder.file(xmlName, xml);
        }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${leafName}.zip`);
}

exportButton.addEventListener("click", download);
