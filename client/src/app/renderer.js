import { findMinMaxPoints, getCenterOfMass, l2Norm } from "../utils";
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
const ROI_COLOR = "#0f0f99";

const image = new Image();
const offset = { x: 0, y: 0 };
const selection = new SelectionList();
const roi = {
    points: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
    ],
};

let zoomLevel = 1;
let annotations = [];
let focused = null; // annotation
let hovered = null; // point
let showAnnotations = true;
let showRoi = false;

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

// converte de coordenadas do canvas para coordenadas da janela
function canvas2win(src, dst) {
    dst.x = (src.x - offset.x) / zoomLevel;
    dst.y = (src.y - offset.y) / zoomLevel;
}

// conventer de coordenadas da janela para coordenadas do canvas (imagem)
function win2canvas(src, dst) {
    dst.x = src.x * zoomLevel + offset.x;
    dst.y = src.y * zoomLevel + offset.y;
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
    let ann, annClass, points;
    const ctxPoint = { x: 0, y: 0 };

    if (showAnnotations) {
        for (let i = 0; i < annotations.length; i++) {
            ann = annotations[i];
            // recalculate the center of the polygon if it has been changed
            if (ann.dirty) {
                ann.center = getCenterOfMass(ann.points);
                ann.dirty = false;
            }

            annClass = classes[ann.class];
            points = ann.points;
            ctx.fillStyle = annClass.color + settings.opacityHex;

            // draw polygon
            if (points.length < 3) {
                ann.path = null;
            } else {
                const path = new Path2D();
                ann.path = path;

                win2canvas(points[0], ctxPoint);
                path.moveTo(ctxPoint.x, ctxPoint.y);

                for (let i = 1; i < points.length; i++) {
                    win2canvas(points[i], ctxPoint);
                    path.lineTo(ctxPoint.x, ctxPoint.y);
                }
                path.closePath();
                ctx.fill(path);
            }

            const pointColors = annClass.points?.colors || annClass.color;
            // only show points from focused annotation
            if (focused === ann) {
                let dir;

                // draw selection
                ctx.fillStyle = SELECTION_COLOR;
                for (let i = 0; i < selection.length; i++) {
                    win2canvas(selection.get(i), ctxPoint);

                    ctx.beginPath();
                    ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
                    ctx.fill();
                }

                // draw points
                for (let i = 0; i < points.length; i++) {
                    ctx.strokeStyle = pointColors[i % pointColors.length];
                    ctx.lineWidth = 3;
                    win2canvas(points[i], ctxPoint);
                    ctx.beginPath();
                    ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
                    ctx.stroke();

                    if (annClass.points?.showNumber) {
                        ctx.font = "20px sans";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "baseline";

                        ctx.fillStyle = ctx.strokeStyle;
                        win2canvas(points[i], ctxPoint);
                        dir = l2Norm(
                            points[i].x - ann.center.x,
                            points[i].y - ann.center.y
                        );

                        ctx.fillText(
                            (i + 1).toString(),
                            ctxPoint.x + dir.x * (RADIUS << 2),
                            ctxPoint.y + dir.y * (RADIUS << 2)
                        );
                    }
                }
            }
        }
    }

    if (showRoi) {
        ctx.strokeStyle = ROI_COLOR;
        ctx.fillStyle = ROI_COLOR + "33";
        ctx.lineWidth = 3;

        const corner1 = { x: -1, y: -1 };
        const corner2 = { x: -1, y: -1 };
        win2canvas(roi.points[0], corner1);
        win2canvas(roi.points[1], corner2);

        ctx.beginPath();
        const path = new Path2D();
        path.rect(
            corner1.x,
            corner1.y,
            corner2.x - corner1.x,
            corner2.y - corner1.y
        );
        roi.path = path;
        ctx.stroke(path);
        ctx.fill(path);

        ctx.beginPath();
        ctx.arc(corner1.x, corner1.y, RADIUS, START_ARC, END_ARC);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(corner2.x, corner2.y, RADIUS, START_ARC, END_ARC);
        ctx.stroke();
    }

    // draw hovered point
    if (hovered) {
        ctx.strokeStyle = HOVER_COLOR;
        win2canvas(hovered, ctxPoint);
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

function centerFocus() {
    if (!focused) {
        return;
    }

    const { min, max } = findMinMaxPoints(focused.points);
    const width = max.x - min.x;
    const height = max.y - min.y;
    const aspectRatio = width / height;
    const newPolyHeight = display.clientHeight * 0.9;
    const newPolyWidth = newPolyHeight * aspectRatio;
    canvas.width = display.clientWidth;
    canvas.height = display.clientHeight;
    setZoomLevel(newPolyHeight / height);

    offset.x = (canvas.width - newPolyWidth) * 0.5 - min.x * zoomLevel;
    offset.y = (canvas.height - newPolyHeight) * 0.5 - min.y * zoomLevel;
    render();
}

function centerSelection() {
    if (selection.length === 0) {
        return;
    }
    setZoomLevel(settings.pointZoom);
    offset.x = canvas.width * 0.5 - selection.get(0).x * zoomLevel;
    offset.y = canvas.height * 0.5 - selection.get(0).y * zoomLevel;
    render();
}

function resetState() {
    focused = null; // annotation
    hovered = null; // point
    showAnnotations = true;
    showRoi = false;
    selection.clear();
}

function reset() {
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

    resetState();
    render();
}

function setImage(_image) {
    if (!_image?.src) {
        console.warn("Missing image or image src");
        return;
    }
    image.src = _image.src;
    annotations = _image.annotations;
    annotations.forEach((ann) => (ann.dirty = true));

    focused = null;
    hovered = null;
}

function setCursor(cursorStyle) {
    canvas.style.cursor = cursorStyle;
}

function addEventListener(eventName, callback) {
    canvas.addEventListener(eventName, callback);
}

function removeEventListener(eventName, callback) {
    canvas.removeEventListener(eventName, callback);
}

image.addEventListener("load", reset);

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("wheel", zoomOnWheel);

export const Renderer = {
    render,
    setCursor,
    setImage,
    toCanvasCoords,
    fromCanvasCoords,
    canvas2win,
    win2canvas,
    pan,
    centerFocus,
    centerSelection,
    reset,
    resetState,
    addEventListener,
    removeEventListener,

    get image() {
        return image;
    },
    get annotations() {
        return annotations;
    },
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
    get roi() {
        return roi;
    },
    get showAnnotations() {
        return showAnnotations;
    },
    set showAnnotations(value) {
        showAnnotations = value;
    },
    get showRoi() {
        return showRoi;
    },
    set showRoi(flag) {
        showRoi = flag;
    },
};
