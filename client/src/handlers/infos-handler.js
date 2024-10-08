import { modalToggle } from "../utils";
import { reset } from "../renderer";

const MAX_TIME = 5999; // 100 min - 1s

const info = document.querySelector("#info");
const infoButton = document.querySelector("#info-button");
const timer = document.querySelector("#timer");
const objLength = document.querySelector("#obj-length");
const currentZoom = document.querySelector("#current-zoom");

let time = 0;
let interval;

function updateTimer() {
    if (++time > MAX_TIME) {
        clearInterval(interval);
        return;
    }

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    timer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
}

export function resetTimer() {
    clearInterval(interval);
    time = 0;
    interval = setInterval(updateTimer, 1000);
}

export function setUiPolyLength(length = 0) {
    objLength.innerHTML = `${length.toString().padStart(3, "0")}`;
}

export function updateZoom(zoom) {
    currentZoom.textContent = (zoom * 100).toFixed(0).padStart(3, "0") + "%";
}

infoButton.addEventListener("click", () => modalToggle(info));
currentZoom.addEventListener("click", reset);
