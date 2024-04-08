import { modalToggle } from "../utils";

const settingsModal = document.querySelector("#settings");
const settingsForm = document.querySelector("#settings-form");
const settingsButton = document.querySelector("#settings-button");

const maxZoomInput = document.querySelector("#max-zoom");
const stepZoomInput = document.querySelector("#step-zoom");
const pointZoomInput = document.querySelector("#point-zoom");
const opacityInput = document.querySelector("#opacity");

const DEFAULT = {
    maxZoom: 8,
    stepZoom: 0.1,
    pointZoom: 8,
    opacity: 0.3,
    opacityHex: "4d",
};

const settings = { ...DEFAULT };

function opacityToHex(opacity) {
    return Math.round(255 * opacity).toString(16);
}

function load() {
    const maxZoomStorage = localStorage.getItem("max-zoom");
    if (maxZoomStorage) {
        settings.maxZoom = parseFloat(maxZoomStorage);
    }

    const stepZoomStorage = localStorage.getItem("step-zoom");
    if (stepZoomStorage) {
        settings.stepZoom = parseFloat(stepZoomStorage);
    }

    const pointZoomStorage = localStorage.getItem("point-zoom");
    if (pointZoomStorage) {
        settings.pointZoom = parseFloat(pointZoomStorage);
    }

    const opacityStorage = localStorage.getItem("opacity");
    if (opacityStorage) {
        settings.opacity = parseFloat(opacityStorage);
        settings.opacityHex = opacityToHex(settings.opacity);
    }

    maxZoomInput.value = settings.maxZoom;
    stepZoomInput.value = settings.stepZoom;
    pointZoomInput.value = settings.pointZoom;
    opacityInput.value = settings.opacity;
}

function set(event) {
    event.preventDefault();

    settings.maxZoom = parseFloat(maxZoomInput.value) || settings.maxZoom;
    settings.stepZoom = parseFloat(stepZoomInput.value) || settings.stepZoom;
    settings.pointZoom = parseFloat(pointZoomInput.value) || settings.pointZoom;
    settings.opacity = parseFloat(opacityInput.value) || settings.opacity;
    settings.opacityHex = opacityToHex(settings.opacity);

    localStorage.setItem("max-zoom", maxZoomInput.value);
    localStorage.setItem("step-zoom", stepZoomInput.value);
    localStorage.setItem("point-zoom", pointZoomInput.value);
    localStorage.setItem("opacity", opacityInput.value);

    modalToggle(settingsModal);
}

settingsButton.addEventListener("click", () => modalToggle(settingsModal));
settingsForm.addEventListener("submit", set);

window.addEventListener("load", load);

export const SettingsHandler = {
    get maxZoom() {
        return settings.maxZoom;
    },
    get stepZoom() {
        return settings.stepZoom;
    },
    get pointZoom() {
        return settings.pointZoom;
    },
    get opacity() {
        return settings.opacity;
    },
    get opacityHex() {
        return settings.opacityHex;
    },
};
