import { IMAGE_MAP } from "../app/app";
import JSZip from "jszip";
import { NORMALIZER } from "./classes-handler";
import saveAs from "file-saver";

const exportButton = document.querySelector("#export-button");

export function pointsToXml(leafName, points, imgName, tag) {
    const space1 = " ".repeat(6);
    const space2 = " ".repeat(8);
    let coordinates = "";

    for (let i = 0; i < points.length; i++) {
        const x = `${space1}<x${i + 1}>${points[i].x / NORMALIZER}</x${
            i + 1
        }>\n`;
        const y = `${space2}<y${i + 1}>${points[i].y / NORMALIZER}</y${
            i + 1
        }>\n`;
        coordinates += x + y;
    }

    return `<annotation>
  <filename>${imgName}</filename>
  <object>
    <leaf> ${leafName} </leaf>
    <${tag}>
${coordinates.trimEnd()}
    </${tag}>
  </object>
</annotation>`.trimStart();
}

async function download() {
    const zip = new JSZip();

    const leafName = document.querySelector("#title").innerText;

    for (const imgName in IMAGE_MAP) {
        const markerFolder = zip.folder("marker");
        const leafFolder = zip.folder("leaf");
        const img = IMAGE_MAP[imgName];
        const markerXml = pointsToXml(
            leafName,
            img.markerPoints,
            imgName,
            "corners"
        );
        const leafXml = pointsToXml(
            leafName,
            img.leafPoints,
            imgName,
            "points"
        );
        markerFolder.file(imgName.replace(".jpg", ".xml"), markerXml);
        leafFolder.file(imgName.replace(".jpg", ".xml"), leafXml);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${leafName}.zip`);
}

exportButton.addEventListener("click", download);
