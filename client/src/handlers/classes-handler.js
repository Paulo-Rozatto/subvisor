import { annotateLeaf, saveXml } from "../api-consumer";
import { currentPath, selected } from "./dataset-load-handler";
import CLASSES from "../classes.json";
import { IMAGE_MAP } from "../app/app";
import { pointsToXml } from "./export-handler";
import { updateLengthInfo } from "./infos-handler";

const markerButton = document.querySelector("#marker-button");
const leafButton = document.querySelector("#leaf-button");
const markerRadio = document.querySelector("#marker-radio");
const leafRadio = document.querySelector("#leaf-radio");
const boxButton = document.querySelector("#box-button");

const Classes = { LEAF: 0, MARKER: 1, BOX: 2 };

let currentClass = null;

function setMarker() {
    markerRadio.checked = true;
    currentClass = Classes.MARKER;
    updateLengthInfo();
}

function setLeaf() {
    leafRadio.checked = true;
    currentClass = Classes.LEAF;
    updateLengthInfo();
}

async function generateLeaf() {
    if (currentClass !== Classes.BOX) {
        markerRadio.checked = false;
        leafRadio.checked = false;
        currentClass = Classes.BOX;
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

export const ClassesHandler = {
    ...CLASSES,
};
