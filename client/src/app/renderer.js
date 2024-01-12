import { SettingsHandler as settings } from "../handlers/settings-handler";

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const display = document.querySelector(".display");
const currentZoom = document.querySelector("#current-zoom");

const image = new Image();
const offset = { x: 0, y: 0 };

let zoomLevel = 1;

// function drawImage() {
//     ctx.imageSmoothingEnabled = false;
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     ctx.drawImage(
//         image,
//         offset.x,
//         offset.y,
//         image.width * zoomLevel,
//         image.height * zoomLevel
//     );
// }

function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        image,
        offset.x,
        offset.y,
        image.width * zoomLevel,
        image.height * zoomLevel
    );

    // showObjects = true;
    // drawImage();
    // drawMarker();
    // drawLeaf();
    // drawBox();
}

function render() {
    requestAnimationFrame(draw);
}

function setZoomLevel(level) {
    zoomLevel = level;
    currentZoom.textContent =
        (zoomLevel * 100).toFixed(0).padStart(3, "0") + "%";
}

function zoomOnWheel(event) {
    const scale =
        event.deltaY > 0 ? 1 - settings.stepZoom : 1 + settings.stepZoom;
    const oldLevel = zoomLevel;
    let newZoom = Math.max(0.1, zoomLevel * scale);
    newZoom = Math.min(settings.maxZoom, newZoom);
    setZoomLevel(newZoom);

    // vc quer achar o ponto que o mouse estava sobre na imagem escalada com o novo zoom
    // e substrair esse ponto do ponto que o mouse aponta atualmente e esse é o seu offset
    // p_old = (x - a, y - b) / zoom_old; p_new = zoom_new * p_old; offset = p_mouse - p_new;
    const zoomRatio = zoomLevel / oldLevel;
    offset.x = event.offsetX - zoomRatio * (event.offsetX - offset.x);
    offset.y = event.offsetY - zoomRatio * (event.offsetY - offset.y);

    render();
}

function pan(dx, dy) {
    offset.x += dx;
    offset.y += dy;
    render();
}

function resetCanvas() {
    if (!image.src) {
        return;
    }
    const imageAspectRatio = image.width / image.height;
    const screenHeight = display.clientHeight * 0.8;
    const screenWidth = screenHeight * imageAspectRatio;

    canvas.width = display.clientWidth;
    canvas.height = display.clientHeight;
    setZoomLevel(screenHeight / image.height);
    offset.x = (canvas.width - screenWidth) * 0.5;
    offset.y = (canvas.height - screenHeight) * 0.5;
    render();
}

function setImage(_image) {
    if (!_image?.src) {
        console.warn("Missing image or image src");
        return;
    }
    image.src = _image.src;
}

function addEventListener(eventName, callback) {
    canvas.addEventListener(eventName, callback);
}

image.addEventListener("load", resetCanvas);

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("wheel", zoomOnWheel);

export const Renderer = {
    render,
    setImage,
    setZoomLevel,
    resetCanvas,
    pan,
    addEventListener,
};
