import { annotateLeaf, saveConfig, saveXml } from "../api-consumer";
import { openPath, selected } from "./dataset-load-handler";
import { IMAGE_MAP } from "../app/app";
import { modalToggle } from "../utils";
import { DefaultParser as parser } from "../app/default-parser";
import { Renderer as renderer } from "../app/renderer";

let current = "";
let last = "";
let classes = {};

const defaultClass = {
    color: "#e0e0e0",
    points: {
        colors: ["#a0a0a0"],
    },
};

const classesDisplay = document.querySelector("#classes-display");
const classesSelect = document.querySelector("#classes-select");
const classesModal = document.querySelector("#classes-modal");
const saveClassesButton = document.querySelector("#save-classes");

const toggleNewClassButton = document.querySelector("#toggle-new-class");
const newClassBody = document.querySelector("#new-class-body");
const addClassButton = document.querySelector("#add-new-class");
const classNameInput = document.querySelector("#input-class-name");
const classColorInput = document.querySelector("#input-class-color");
const pointColorInput = document.querySelector("#input-point-color");
const pointLimitInput = document.querySelector("#input-point-limit");
const showNumbersRadio = document.querySelector("#radio-show-numbers");

function resetNewClassFields() {
    newClassBody.classList.add("hide");

    for (const field of [
        classNameInput,
        classColorInput,
        pointColorInput,
        pointLimitInput,
    ]) {
        field.value = "";
    }
}

function setCurrent(newClass) {
    if (newClass === "") {
        classesDisplay.innerText = "---";
        current = "";
    }

    if (!classes[newClass]) {
        return;
    }

    current = newClass;
    last = newClass;
    classesDisplay.innerText = newClass;
}

function openClassesModal() {
    classesSelect.value = current;
    resetNewClassFields();
    modalToggle(classesModal);
}

function swithClass(event) {
    event.preventDefault();

    modalToggle(classesModal);

    if (classesSelect.value === current || !renderer.focused) {
        return;
    }

    setCurrent(classesSelect.value);

    if (current && renderer.focused) {
        renderer.focused.class = current;
        renderer.render();
    }
}

function addNewClass(event) {
    event.preventDefault();
    const missing = [];

    for (const field of [classNameInput, classColorInput, pointColorInput]) {
        if (!field.value) {
            missing.push(
                document.querySelector(`[for="${field.id}"]`).innerText
            );
        }
    }

    if (missing.length > 0) {
        alert("Os seguintes campos são obrigatórios: " + missing.join(", "));
        return;
    }

    const className = classNameInput.value.trim();
    classes[className] = {
        color: classColorInput.value,
        points: {
            colors: pointColorInput.value.split(";").map((e) => e.trim()),
            limit: parseInt(pointLimitInput.value),
            showNumber: showNumbersRadio.checked,
        },
    };

    saveConfig(openPath, { classes });

    const defaultEl = document.createElement("option");
    defaultEl.innerText = className;
    defaultEl.value = className;

    const fragment = new DocumentFragment();
    fragment.append(defaultEl);
    classesSelect.append(fragment);

    classesSelect.value = className;
    swithClass(event);
}

async function predictAnnotation(points, isBox) {
    const fileName = selected.innerText + ".jpg";
    const filePath = openPath + "/" + fileName;
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
    renderer.render();

    const xml = parser.annotationsToXml(
        leafName,
        fileName,
        IMAGE_MAP[fileName].annotations
    );
    saveXml(openPath, "annotations", fileName.replace(".jpg", ".xml"), xml);
}

saveClassesButton.addEventListener("click", swithClass);
addClassButton.addEventListener("click", addNewClass);
classesDisplay.parentElement.addEventListener("click", openClassesModal);

toggleNewClassButton.addEventListener("click", () =>
    newClassBody.classList.toggle("hide")
);

function setClasses(newClasses) {
    classes = newClasses;
    classes.default = defaultClass;
    classesSelect.textContent = "";

    const fragment = new DocumentFragment();

    const defaultEl = document.createElement("option");
    defaultEl.innerText = "default";
    defaultEl.value = "default";
    defaultEl.disabled = true;
    fragment.append(defaultEl);

    for (const className of Object.keys(classes).sort()) {
        if (className === "default") {
            continue;
        }

        const element = document.createElement("option");
        element.innerText = className;
        element.value = className;
        fragment.append(element);
    }
    classesSelect.append(fragment);
}

export const ClassesHandler = {
    setClasses,
    predictAnnotation,

    get current() {
        return current;
    },
    set current(newClass) {
        setCurrent(newClass);
    },

    get default() {
        return defaultClass;
    },

    get last() {
        return last;
    },

    get(className) {
        return classes[className];
    },
};
