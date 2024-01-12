import { annotateLeaf, saveXml } from "../api-consumer";
import { currentPath, selected } from "./dataset-load-handler";
import { IMAGE_MAP } from "../app/app";
import { pointsToXml } from "./export-handler";
import { updateLengthInfo } from "./infos-handler";

const markerButton = document.querySelector("#marker-button");
const leafButton = document.querySelector("#leaf-button");
const markerRadio = document.querySelector("#marker-radio");
const leafRadio = document.querySelector("#leaf-radio");
const boxButton = document.querySelector("#box-button");

const CLASSES = { LEAF: 0, MARKER: 1, BOX: 2 };
export const NORMALIZER = 4624;

let currentClass = null;

function setMarker() {
    markerRadio.checked = true;
    currentClass = CLASSES.MARKER;
    updateLengthInfo();
}

function setLeaf() {
    leafRadio.checked = true;
    currentClass = CLASSES.LEAF;
    updateLengthInfo();
}

async function generateLeaf() {
    if (currentClass !== CLASSES.BOX) {
        markerRadio.checked = false;
        leafRadio.checked = false;
        currentClass = CLASSES.BOX;
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
    get LEAF() {
        return CLASSES.LEAF;
    },
    get MARKER() {
        return CLASSES.MARKER;
    },
    get BOX() {
        return CLASSES.BOX;
    },
    get current() {
        return currentClass;
    },
};
