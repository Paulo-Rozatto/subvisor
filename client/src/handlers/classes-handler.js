import { focusCanvas, render } from "../renderer";
import { focus } from "../app";
import { modalToggle } from "../utils";
import { openPath } from "./dataset-load-handler";
import { saveConfig } from "../api-consumer";

const defaultClass = {
    name: "default",
    color: "#e0e0e0",
    enumerate: false,
    fill: true,
    stroke: false,
};

let currentClass = defaultClass;
let classes = [];

const classesWrapper = document.querySelector("#classes-wrapper");
const classesDisplay = document.querySelector("#classes-display");
const classesSelect = document.querySelector("#classes-select");
const classesOptions = document.querySelector("#classes-options");
const classesModal = document.querySelector("#new-class-modal");

const classNameInput = document.querySelector("#input-class-name");
const classColorInput = document.querySelector("#input-class-color");
const pointLimitInput = document.querySelector("#input-point-limit");
const enumerateCheckbox = document.querySelector("#check-enumerate");

function resetNewClassFields() {
    classNameInput.value = "";
    pointLimitInput.value = "";
    enumerateCheckbox.checked = false;
}

export function setCurrentClass(newClass) {
    if (newClass === "" || newClass === "default") {
        classesDisplay.innerText = "default";
        currentClass = null;
    }

    const clss = classes.find((c) => c.name === newClass);
    if (!clss) {
        return;
    }

    currentClass = clss;
    classesDisplay.innerText = newClass;
}

function openClassesModal() {
    classesOptions.value = currentClass?.name || "";
    resetNewClassFields();
    modalToggle(classesModal);
}

function swithClass() {
    if (classesOptions.value === currentClass?.name) {
        return;
    }

    setCurrentClass(classesOptions.value);

    if (currentClass && focus.polygon) {
        focus.polygon.class = classes.find((c) => c.name === currentClass.name);
        focus.image.saved = false;
        focusCanvas();
        render();
    }
}

function selectClassOption(event) {
    classesSelect.classList.add("hide");
    classesOptions.value = event.target.innerText;
    swithClass();
}

function saveNewClass(event) {
    event.preventDefault();
    const missing = [];

    for (const field of [classNameInput, classColorInput]) {
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
        enumerate: enumerateCheckbox.checked,
        fill: true,
        stroke: false,
    });

    saveConfig(openPath, { classes });

    const newEl = document.createElement("li");
    newEl.innerText = className;
    newEl.onclick = selectClassOption;
    newEl.value = className;

    const fragment = new DocumentFragment();
    fragment.append(newEl);
    classesOptions.append(fragment);

    classesOptions.value = className;
    swithClass();
    modalToggle(classesModal);
}

function toggleClassesOptions() {
    classesSelect.classList.toggle("hide");
}

function closeClassesOptions(event) {
    if (
        event.target !== classesWrapper &&
        !classesWrapper.contains(event.target) &&
        event.target !== classesSelect &&
        !classesSelect.contains(event.target)
    ) {
        classesSelect.classList.add("hide");
    }
}

function filterClassesOptions(event) {
    const searchString = event.target.value.toLowerCase();

    for (const option of classesOptions.children) {
        if (option.innerText.toLowerCase().indexOf(searchString) === -1) {
            option.classList.add("hide");
        } else {
            option.classList.remove("hide");
        }
    }
}

function setClasses(newClasses) {
    classes = newClasses || [];

    const idx = classes.findIndex((c) => c.name === "default");
    if (idx === -1) {
        classes.push(defaultClass);
    } else {
        classes.splice(idx, 1, defaultClass);
    }

    classesOptions.textContent = "";

    const fragment = new DocumentFragment();

    const defaultEl = document.createElement("li");
    defaultEl.innerText = "default";
    defaultEl.onclick = selectClassOption;
    fragment.append(defaultEl);

    for (const clss of classes.sort((a, b) => a.name.localeCompare(b.name))) {
        if (clss.name === "default") {
            continue;
        }

        const element = document.createElement("li");
        element.innerText = clss.name;
        element.onclick = selectClassOption;
        fragment.append(element);
    }
    classesOptions.append(fragment);
}

function push(newClass) {
    classes.push(newClass);
}

classesWrapper.addEventListener("click", toggleClassesOptions);
document
    .querySelector("#add-class-button")
    .addEventListener("click", openClassesModal);
document
    .querySelector("#save-new-class")
    .addEventListener("click", saveNewClass);
document
    .querySelector("#class-search-input")
    .addEventListener("keyup", filterClassesOptions);

document.addEventListener("pointerdown", closeClassesOptions);

export const ClassesHandler = {
    setClasses,

    push,

    get current() {
        return currentClass;
    },
    set current(newClass) {
        setCurrentClass(newClass);
    },

    get default() {
        return defaultClass;
    },

    get list() {
        return Object.keys(classes);
    },

    get(className) {
        return classes.find((c) => c.name === className) || defaultClass;
    },
};
