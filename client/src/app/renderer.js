import { SelectionList } from "./selection-list";
import { ClassesHandler as classes } from "../handlers/classes-handler";
import { SettingsHandler as settings } from "../handlers/settings-handler";

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const display = document.querySelector(".display");
const currentZoom = document.querySelector("#current-zoom");

// constants padroes
const START_ARC = 0;
const END_ARC = 2 * Math.PI;
const RADIUS = 5;
const HOVER_COLOR = "#a5db94";
const SELECTION_COLOR = "#38cb0b";

const image = new Image();
const offset = { x: 0, y: 0 };
const selection = new SelectionList();

let zoomLevel = 1;
let annotations = [];
let focused = null; // annotation
let hovered = null; // point

function toCanvasCoords(x, y) {
    return {
        x: x * zoomLevel + offset.x,
        y: y * zoomLevel + offset.y,
    };
}

function fromCanvasCoords(x, y) {
    return {
        x: (x - offset.x) / zoomLevel,
        y: (y - offset.y) / zoomLevel,
    };
}

function draw() {
    // draw image
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        image,
        offset.x,
        offset.y,
        image.width * zoomLevel,
        image.height * zoomLevel
    );

    // draw annotations
    let annClass, points, ctxPoint;
    for (let i = 0; i < annotations.length; i++) {
        annClass = classes[annotations[i].class];
        points = annotations[i].points;
        ctx.fillStyle = annClass.color + settings.opacityHex;

        // draw polygon
        if (points.length < 3) {
            annotations[i].path = null;
        } else {
            const path = new Path2D();
            annotations[i].path = path;

            ctxPoint = toCanvasCoords(points[0].x, points[0].y);
            path.moveTo(ctxPoint.x, ctxPoint.y);

            for (let i = 1; i < points.length; i++) {
                ctxPoint = toCanvasCoords(points[i].x, points[i].y);
                path.lineTo(ctxPoint.x, ctxPoint.y);
            }
            path.closePath();
            ctx.fill(path);
        }

        // only show points from focused annotation
        if (focused !== annotations[i]) {
            continue;
        }

        // draw selection
        ctx.fillStyle = SELECTION_COLOR;
        for (let i = 0; i < selection.length; i++) {
            ctxPoint = selection.get(i);
            ctxPoint = toCanvasCoords(ctxPoint.x, ctxPoint.y);

            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.fill();
        }

        // draw points and text
        ctx.font = "20px sans";
        const pcolors = annClass.points?.colors || annClass.color;
        for (let i = 0; i < points.length; i++) {
            ctx.strokeStyle = pcolors[i % pcolors.length];
            ctx.lineWidth = 3;
            ctxPoint = toCanvasCoords(points[i].x, points[i].y);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.stroke();

            if (annClass.points?.showNumber) {
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fillText(`${i + 1}`, ctxPoint.x + 15, ctxPoint.y + 10);
            }
        }
    }

    // draw hovered point
    if (hovered) {
        ctx.strokeStyle = HOVER_COLOR;
        ctxPoint = toCanvasCoords(hovered.x, hovered.y);
        ctx.beginPath();
        ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
        ctx.stroke();
    }
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
    annotations = _image.annotations;
    focused = null;
    hovered = null;
}

function setCursor(cursorStyle) {
    canvas.style.cursor = cursorStyle;
}

function addEventListener(eventName, callback) {
    canvas.addEventListener(eventName, callback);
}

image.addEventListener("load", resetCanvas);

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("wheel", zoomOnWheel);

export const Renderer = {
    render,
    setCursor,
    setImage,
    toCanvasCoords,
    fromCanvasCoords,
    resetCanvas,
    pan,
    addEventListener,

    get context() {
        return ctx;
    },
    get selection() {
        return selection;
    },
    get zoomLevel() {
        return zoomLevel;
    },
    set zoomLevel(level) {
        setZoomLevel(level);
    },
    get focused() {
        return focused;
    },
    set focused(annotation) {
        focused = annotation;
    },
    get hovered() {
        return hovered;
    },
    set hovered(point) {
        hovered = point;
    },
};
