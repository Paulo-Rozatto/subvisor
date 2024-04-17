import { focus } from "../app";
import { modalToggle } from "../utils";
import { openPath } from "./dataset-load-handler";
import { render } from "../renderer";
import { saveConfig } from "../api-consumer";

let currentClass = null;
let last = "";
let classes = [];

const defaultClass = {
    name: "default",
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
        currentClass = null;
    }

    const clss = classes.find((c) => c.name === newClass);
    if (!clss) {
        return;
    }

    currentClass = clss;
    last = newClass;
    classesDisplay.innerText = newClass;
}

function openClassesModal() {
    classesSelect.value = currentClass?.name || "---";
    resetNewClassFields();
    modalToggle(classesModal);
}

function swithClass(event) {
    event.preventDefault();

    modalToggle(classesModal);

    if (classesSelect.value === currentClass?.name || !focus.polygon) {
        return;
    }

    setCurrent(classesSelect.value);

    if (currentClass && focus.polygon) {
        focus.polygon.class = classes.find((c) => c.name === currentClass.name);
        render();
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
    classes.push({
        name: className,
        color: classColorInput.value,
        limit: parseInt(pointLimitInput.value) || undefined,
        enumerate: showNumbersRadio.checked,
        fill: true,
        stroke: false,
    });

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

saveClassesButton.addEventListener("click", swithClass);
addClassButton.addEventListener("click", addNewClass);
classesDisplay.parentElement.addEventListener("click", openClassesModal);

toggleNewClassButton.addEventListener("click", () =>
    newClassBody.classList.toggle("hide")
);

function setClasses(newClasses) {
    classes = newClasses;

    const idx = classes.findIndex((c) => c.name === "default");
    if (idx === -1) {
        classes.push(defaultClass);
    } else {
        classes.splice(idx, 1, defaultClass);
    }

    classesSelect.textContent = "";

    const fragment = new DocumentFragment();

    const defaultEl = document.createElement("option");
    defaultEl.innerText = "default";
    defaultEl.value = "default";
    defaultEl.disabled = true;
    fragment.append(defaultEl);

    for (const clss of classes.sort((a, b) => a.name.localeCompare(b.name))) {
        if (clss.name === "default") {
            continue;
        }

        const element = document.createElement("option");
        element.innerText = clss.name;
        element.value = clss.name;
        fragment.append(element);
    }
    classesSelect.append(fragment);
}

export const ClassesHandler = {
    setClasses,
    // predictAnnotation,

    get current() {
        return currentClass;
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

    get list() {
        return Object.keys(classes);
    },

    get(className) {
        return classes.find((c) => c.name === className) || defaultClass;
    },
};
