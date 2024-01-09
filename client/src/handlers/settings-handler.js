import { getConfigs, setConfigs } from "../app";
import { modalToggle } from "../utils";

const settings = document.querySelector("#settings");
const settingsForm = document.querySelector("#settings-form");
const settingsButton = document.querySelector("#settings-button");

const maxZoomInput = document.querySelector("#max-zoom");
const stepZoomInput = document.querySelector("#step-zoom");
const pointZoomInput = document.querySelector("#point-zoom");
const opacityInput = document.querySelector("#opacity");

function setDefault() {
    let { maxZoom, stepZoom, pointZoom, opacity } = getConfigs();
    const maxZoomStorage = localStorage.getItem("max-zoom");
    if (maxZoomStorage) {
        maxZoom = parseFloat(maxZoomStorage);
    }

    const stepZoomStorage = localStorage.getItem("step-zoom");
    if (stepZoomStorage) {
        stepZoom = parseFloat(stepZoomStorage);
    }

    const pointZoomStorage = localStorage.getItem("point-zoom");
    if (pointZoomStorage) {
        pointZoom = parseFloat(pointZoomStorage);
    }

    const opacityStorage = localStorage.getItem("opacity");
    if (opacityStorage) {
        opacity = parseFloat(opacityStorage);
    }

    setConfigs({ maxZoom, stepZoom, pointZoom, opacity });
    maxZoomInput.value = maxZoom;
    stepZoomInput.value = stepZoom;
    pointZoomInput.value = pointZoom;
    opacityInput.value = opacity;
}

function set(event) {
    event.preventDefault();

    const confs = getConfigs();
    const maxZoom = maxZoomInput.value;
    const stepZoom = stepZoomInput.value;
    const pointZoom = pointZoomInput.value;
    const opacity = opacityInput.value;

    confs.maxZoom = parseFloat(maxZoom);
    confs.stepZoom = parseFloat(stepZoom);
    confs.pointZoom = parseFloat(pointZoom);
    confs.opacity = parseFloat(opacity);

    localStorage.setItem("max-zoom", maxZoom);
    localStorage.setItem("step-zoom", stepZoom);
    localStorage.setItem("point-zoom", pointZoom);
    localStorage.setItem("opacity", opacity);

    setConfigs(confs);
    modalToggle(settings);
}

settingsButton.addEventListener("click", () => modalToggle(settings));
settingsForm.addEventListener("submit", set);

export const SettingsHandler = { setDefault };
