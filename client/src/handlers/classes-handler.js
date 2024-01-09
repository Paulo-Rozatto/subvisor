import { CLASSES, IMAGE_MAP, getCurrentClass, setSelectedPoints } from "../app";
import { annotateLeaf, saveXml } from "../api-consumer";
import { currentPath, selected } from "./dataset-load-handler";
import { pointsToXml } from "./export-handler";
import { updateLengthInfo } from "./infos-handler";

const markerButton = document.querySelector("#marker-button");
const leafButton = document.querySelector("#leaf-button");
const markerRadio = document.querySelector("#marker-radio");
const leafRadio = document.querySelector("#leaf-radio");
const boxButton = document.querySelector("#box-button");

function setMarker() {
    markerRadio.checked = true;
    setSelectedPoints(CLASSES.MARKER);
    updateLengthInfo();
}

function setLeaf() {
    leafRadio.checked = true;
    setSelectedPoints(CLASSES.LEAF);
    updateLengthInfo();
}

async function generateLeaf() {
    if (getCurrentClass() !== CLASSES.BOX) {
        markerRadio.checked = false;
        leafRadio.checked = false;
        setSelectedPoints(CLASSES.BOX);
        return;
    }

    const path = currentPath;
    const fileName = selected.innerText;
    const leafName = document.querySelector("#title").innerText;

    await annotateLeaf();

    const points = IMAGE_MAP[fileName + ".jpg"].leafPoints;
    const xml = pointsToXml(leafName, points, fileName + ".jpg", "points");
    saveXml(path, "leaf", fileName + ".xml", xml);
}

markerButton.addEventListener("click", setMarker);
leafButton.addEventListener("click", setLeaf);
boxButton.addEventListener("click", generateLeaf);
