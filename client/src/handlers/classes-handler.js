import { annotateLeaf, saveXml } from "../api-consumer";
import { currentPath, selected } from "./dataset-load-handler";
import CLASSES from "../classes.json";
import { IMAGE_MAP } from "../app/app";
import { modalToggle } from "../utils";
import { DefaultParser as parser } from "../app/default-parser";
import { Renderer as renderer } from "../app/renderer";

let current = "";

const classesDisplay = document.querySelector("#classes-display");
const classesSelect = document.querySelector("#classes-select");
const classesModal = document.querySelector("#classes-modal");
const saveClassesButton = document.querySelector("#save-classes");

function setCurrent(newClass) {
    if (newClass === "") {
        classesDisplay.innerText = "-";
        current = "";
    }

    if (!CLASSES[newClass]) {
        return;
    }

    current = newClass;
    classesDisplay.innerText = newClass;
}

function openClassesModal() {
    if (!current) {
        return;
    }

    classesSelect.value = current;
    modalToggle(classesModal);
}

function swithClass(event) {
    event.preventDefault();

    if (classesSelect.value === current || !renderer.focused) {
        return;
    }

    setCurrent(classesSelect.value);

    if (current) {
        renderer.focused.class = current;
        renderer.render();
    }

    modalToggle(classesModal);
}

async function predictAnnotation(points, isBox) {
    const fileName = selected.innerText + ".jpg";
    const filePath = currentPath + "/" + fileName;
    const leafName = document.querySelector("#title").innerText;

    if (isBox) {
        const topLeft = {
            x: Math.min(points[0].x, points[1].x),
            y: Math.min(points[0].y, points[1].y),
        };

        const bottomRight = {
            x: Math.max(points[0].x, points[1].x),
            y: Math.max(points[0].y, points[1].y),
        };

        points = [topLeft, bottomRight];
    }

    const newPoints = await annotateLeaf(filePath, points, isBox);

    if (!newPoints) {
        return;
    }

    let ann;
    if (renderer.focused) {
        ann = renderer.focused;
    } else {
        ann = { class: current || "default" };
        IMAGE_MAP[fileName].annotations.push(ann);
    }
    ann.points = newPoints;
    const xml = parser.pointsToXml(leafName, fileName, ann);
    renderer.render();
    saveXml(currentPath, ann.class, fileName.replace(".jpg", ".xml"), xml);
}

saveClassesButton.addEventListener("click", swithClass);
classesDisplay.parentElement.addEventListener("click", openClassesModal);

(() => {
    const fragment = new DocumentFragment();
    for (const _class in CLASSES) {
        const element = document.createElement("option");
        element.innerText = _class;
        element.value = _class;
        fragment.append(element);
    }
    classesSelect.append(fragment);
})();

export const ClassesHandler = {
    ...CLASSES,
    predictAnnotation,

    get current() {
        return current;
    },
    set current(newClass) {
        setCurrent(newClass);
    },
};
