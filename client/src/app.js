/* eslint-disable no-use-before-define */
// todo: follow the eslint rule above
import { KeyboardMover } from "./keyboard-mover";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const display = document.querySelector(".display");
const exchange = document.querySelector("#exchange");
const currentZoom = document.querySelector("#current-zoom");
const image = new Image();
const offset = { x: 0, y: 0 };
const undoStack = [];
const redoStack = [];
const serverUrl = "http://localhost:8080";

// constants padroes
const START_ARC = 0;
const END_ARC = 2 * Math.PI;
const RADIUS = 5;
const DEFAULT_MAX_ZOOM = 8;
const DEFAULT_STEP_ZOOM = 0.1;
const DEFAULT_OPACITY = 0.4;
const MARKER_COLORS = ["#f00", "#070", "#00f", "#950"];
const MARKER_COLORS_SELECTION = ["#f88", "#0f0", "#88f", "#fbb"];
const HOVER_COLOR = "#00ffff";
const SELECTION_COLOR = "#aa0077";
const EXCHANGE_ALLOWED_KEYS = ["1", "2", "3", "4", "Backspace", "Enter"];
const MAX_STACK_SIZE = 20;

// altura da imagem em pixels, normalizamos os pontos para ficarem entre 0 e 1
export const NORMALIZER = 4624;
export const IMAGE_MAP = {};
export const CLASSES = {
    MARKER: 0,
    LEAF: 1,
    BOX: 2,
};

let zoomLevel = 1;
let markerPoints = [];
let leafPoints = [];
const boxPoints = [];
let currentPoints = markerPoints;
let hoverIndex = -1;
const selectionIndexes = [];
const mousePos = { x: 0, y: 0 };
let currentClass = CLASSES.MARKER;
let showObjects = true;
let maxZoom = DEFAULT_MAX_ZOOM;
let stepZoom = DEFAULT_STEP_ZOOM;
let pointZoom = DEFAULT_MAX_ZOOM; // zoom quando se centraliza um ponto usando 'v' ou 'x'
let opacity = DEFAULT_OPACITY;
let currentImage = null;

export function getConfigs() {
    return { maxZoom, stepZoom, pointZoom, opacity };
}

export function setConfigs(configs) {
    maxZoom = configs.maxZoom || maxZoom;
    stepZoom = configs.stepZoom || stepZoom;
    pointZoom = configs.pointZoom || pointZoom;
    opacity = configs.opacity || opacity;
    setCanvas();
    render();
}

export function getImageInfo() {
    const points = currentPoints
        .map((p) => `${parseInt(p.x)},${parseInt(p.y)}`)
        .join(",");
    return {
        name: currentImage,
        path: IMAGE_MAP[currentImage].filePath,
        points,
    };
}

export function getObjectLength() {
    return currentPoints.length;
}

export function getCurrentClass() {
    return currentClass;
}

export function setSelectedPoints(option) {
    selectionIndexes.length = 0;
    if (option === CLASSES.MARKER) {
        currentPoints = markerPoints;
        currentClass = CLASSES.MARKER;
        exchange.parentElement.classList.remove("hide");
    } else if (option === CLASSES.LEAF) {
        currentPoints = leafPoints;
        currentClass = CLASSES.LEAF;
        exchange.parentElement.classList.add("hide");
    } else if (option === CLASSES.BOX) {
        currentPoints = boxPoints;
        currentClass = CLASSES.BOX;
        exchange.parentElement.classList.add("hide");
    } else {
        setSelectedPoints(currentClass);
        return;
    }
    render();
}

function pointsFromEntry(entry, tagName) {
    return new Promise((resolve, reject) => {
        entry.file((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target.result;
                const parser = new DOMParser();
                const xml = parser.parseFromString(src, "text/xml");
                const tag = xml.getElementsByTagName(tagName)[0];

                if (!tag) {
                    alert(`ERRO: ${entry.name} não tem tag <${tagName}>`);
                    reject([]);
                    return;
                }

                const corners = tag.children;
                const pts = [];
                for (let i = 0; i < corners.length; i += 2) {
                    const point = {
                        x: parseFloat(corners[i].textContent) * NORMALIZER,
                        y: parseFloat(corners[i + 1].textContent) * NORMALIZER,
                    };
                    pts.push(point);
                }

                resolve(pts);
            };
            reader.readAsText(file);
        });
    });
}

export function setLeaftPoints(points, imageName = currentImage) {
    const img = IMAGE_MAP[imageName];

    if (!img) {
        return;
    }

    img.leafPoints = points;
    if (imageName === currentImage) {
        leafPoints = points;
        render();
    }
}

export async function loadImage(fileEntry, marker, leaf, cb = () => {}) {
    const img = IMAGE_MAP[fileEntry.name];
    currentImage = fileEntry.name;

    if (img) {
        image.src = img.src;
        markerPoints = img.markerPoints;
        leafPoints = img.leafPoints;
        setSelectedPoints();
        cb();
        return;
    }

    markerPoints = !marker ? [] : await pointsFromEntry(marker, "corners");
    leafPoints = !leaf ? [] : await pointsFromEntry(leaf, "points");

    const filePath = fileEntry.fullPath;
    fileEntry.file((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target.result;
            image.src = src;
            IMAGE_MAP[fileEntry.name] = {
                src,
                markerPoints,
                leafPoints,
                filePath,
            };
            setSelectedPoints();
            cb();
        };
        reader.readAsDataURL(file);
    });
    selectionIndexes.length = 0;
}

async function loadXml(path, tagName) {
    const response = await fetch(path);

    if (!response.ok) {
        console.error(
            `ERROR ${response.status}: ${response.statusText}, request: ${response.url}`
        );
        return [];
    }

    const fileText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(fileText, "text/xml");
    const tag = xml.getElementsByTagName(tagName)[0];

    if (!tag) {
        alert(`ERRO: ${path} não tem tag <${tagName}>`);
        return [];
    }

    const children = tag.children;
    const points = [];
    for (let i = 0; i < children.length; i += 2) {
        const point = {
            x: parseFloat(children[i].textContent) * NORMALIZER,
            y: parseFloat(children[i + 1].textContent) * NORMALIZER,
        };
        points.push(point);
    }

    return points;
}

export async function loadBackendImage(path, imageName, cb = () => {}) {
    const img = IMAGE_MAP[imageName];
    const src = `${serverUrl}/datasets/${path}/${imageName}`;
    currentImage = imageName;
    selectionIndexes.length = 0;

    if (img) {
        image.src = src;
        markerPoints = img.markerPoints;
        leafPoints = img.leafPoints;
        setSelectedPoints();
        cb();
        return;
    }

    const xmlName = imageName.replace(".jpg", ".xml");
    const leafPath = `${serverUrl}/datasets/${path}/leaf/${xmlName}`;
    const markerPath = `${serverUrl}/datasets/${path}/marker/${xmlName}`;

    if (path && imageName) {
        image.src = src;
        markerPoints = await loadXml(markerPath, "corners");
        leafPoints = await loadXml(leafPath, "points");
        IMAGE_MAP[imageName] = {
            src,
            markerPoints,
            leafPoints,
            filePath: src.split("datasets")[1],
        };
        setSelectedPoints();
        cb();
    }
}

image.addEventListener("load", setCanvas);

function setZoomLevel(level) {
    zoomLevel = level;
    currentZoom.textContent =
        (zoomLevel * 100).toFixed(0).padStart(3, "0") + "%";
}

function setCanvas() {
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

function centerObject() {
    const x0 = Math.min(...currentPoints.map((p) => p.x));
    const x1 = Math.max(...currentPoints.map((p) => p.x));
    const y0 = Math.min(...currentPoints.map((p) => p.y));
    const y1 = Math.max(...currentPoints.map((p) => p.y));
    const width = x1 - x0;
    const height = y1 - y0;
    const aspectRation = width / height;
    const screenHeight = display.clientHeight * 0.8;
    const screenWidth = screenHeight * aspectRation;
    canvas.width = display.clientWidth;
    canvas.height = display.clientHeight;
    setZoomLevel(screenHeight / height);
    offset.x = (canvas.width - screenWidth) * 0.5 - x0 * zoomLevel;
    offset.y = (canvas.height - screenHeight) * 0.5 - y0 * zoomLevel;
    render();
}

function centerPoint() {
    if (selectionIndexes.length > 0) {
        setZoomLevel((zoomLevel = pointZoom));
        offset.x =
            -currentPoints[selectionIndexes[0]].x * zoomLevel +
            canvas.width * 0.5;
        offset.y =
            -currentPoints[selectionIndexes[0]].y * zoomLevel +
            canvas.height * 0.5;
        render();
    }
}

document.getElementById("reset-button").onclick = setCanvas;
setCanvas();

function render() {
    requestAnimationFrame(draw);
}

function draw() {
    showObjects = true;
    drawImage();
    drawMarker();
    drawLeaf();
    drawBox();
}

function drawImage() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        image,
        offset.x,
        offset.y,
        image.width * zoomLevel,
        image.height * zoomLevel
    );
}

function drawMarker() {
    ctx.fillStyle = `rgba(0, 200, 200, ${opacity})`;

    drawPolygon(markerPoints);

    if (currentPoints === markerPoints) {
        let ctxPoint;
        ctx.font = "20px sans";

        let idx;
        for (let i = 0; i < selectionIndexes.length; i++) {
            idx = selectionIndexes[i];
            ctx.fillStyle = MARKER_COLORS_SELECTION[idx];
            ctxPoint = toCanvasCoords(markerPoints[idx]);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.fill();
        }

        for (let i = 0; i < markerPoints.length && i < 4; i++) {
            ctx.strokeStyle = MARKER_COLORS[i];
            ctx.lineWidth = 3;
            ctxPoint = toCanvasCoords(markerPoints[i]);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.stroke();
            ctx.fillStyle = MARKER_COLORS[i];
            ctx.fillText(`${i + 1}`, ctxPoint.x + 15, ctxPoint.y + 10);
        }

        if (hoverIndex >= 0) {
            ctx.strokeStyle = HOVER_COLOR;
            ctxPoint = toCanvasCoords(markerPoints[hoverIndex]);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.stroke();
        }
    }
}

function drawLeaf() {
    ctx.strokeStyle = "#A02";
    ctx.fillStyle = `rgba(200, 0, 0, ${opacity})`;
    ctx.lineWidth = 3;

    drawPolygon(leafPoints);

    if (currentPoints === leafPoints) {
        let ctxPoint;

        let idx;
        for (let i = 0; i < selectionIndexes.length; i++) {
            idx = selectionIndexes[i];
            ctx.fillStyle = SELECTION_COLOR;
            ctxPoint = toCanvasCoords(leafPoints[idx]);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.fill();
        }

        for (const point of leafPoints) {
            ctxPoint = toCanvasCoords(point);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.stroke();
        }

        if (hoverIndex >= 0) {
            ctx.strokeStyle = HOVER_COLOR;
            ctxPoint = toCanvasCoords(leafPoints[hoverIndex]);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.stroke();
        }
    }
}

function drawBox() {
    if (currentPoints !== boxPoints) {
        return;
    }

    ctx.strokeStyle = "#AA2";
    let ctxPoint;
    for (const point of boxPoints) {
        ctxPoint = toCanvasCoords(point);
        ctx.beginPath();
        ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
        ctx.closePath();
        ctx.stroke();
    }

    if (boxPoints.length === 2) {
        const corner1 = toCanvasCoords(boxPoints[0]);
        const corner2 = toCanvasCoords(boxPoints[1]);
        ctx.strokeRect(
            corner1.x,
            corner1.y,
            corner2.x - corner1.x,
            corner2.y - corner1.y
        );
    }
}

function drawPolygon(points) {
    if (points.length > 2) {
        ctx.beginPath();
        let ctxPoint = toCanvasCoords(points[0]);
        ctx.moveTo(ctxPoint.x, ctxPoint.y);
        for (let i = 1; i < points.length; i++) {
            ctxPoint = toCanvasCoords(points[i]);
            ctx.lineTo(ctxPoint.x, ctxPoint.y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

function handleBoxPan() {
    const [p1, p2] = boxPoints.map((point) => toCanvasCoords(point));
    if (
        mousePos.x > p1.x &&
        mousePos.x < p2.x &&
        mousePos.y > p1.y &&
        mousePos.y < p2.y
    ) {
        canvas.onmousemove = (event) => {
            panPoint(event, boxPoints[0]);
            panPoint(event, boxPoints[1]);
        };
        canvas.style.cursor = "grabbing";
    }
}

function handleZoom(event) {
    const scale = event.deltaY > 0 ? 1 - stepZoom : 1 + stepZoom;
    const oldLevel = zoomLevel;
    let newZoom = Math.max(0.1, zoomLevel * scale);
    newZoom = Math.min(maxZoom, newZoom);
    setZoomLevel(newZoom);

    // vc quer achar o ponto que o mouse estava sobre na imagem escalada com o novo zoom
    // e substrair esse ponto do ponto que o mouse aponta atualmente e esse é o seu offset
    // p_old = (x - a, y - b) / zoom_old; p_new = zoom_new * p_old; offset = p_mouse - p_new;
    const zoomRatio = zoomLevel / oldLevel;
    offset.x = mousePos.x - zoomRatio * (mousePos.x - offset.x);
    offset.y = mousePos.y - zoomRatio * (mousePos.y - offset.y);
    trackMouse(event);

    render();
}

function handleMouseDown(event) {
    if (event.button === 0) {
        if (hoverIndex < 0) {
            if (currentClass === CLASSES.BOX && boxPoints.length === 2) {
                handleBoxPan();
                return;
            }

            createPoint(event.offsetX, event.offsetY);
            return;
        }

        if (event.ctrlKey) {
            if (selectionIndexes.includes(hoverIndex)) {
                selectionIndexes.splice(
                    selectionIndexes.indexOf(hoverIndex),
                    1
                );
            } else {
                selectionIndexes.push(hoverIndex);
            }
            render();
            return;
        }

        if (event.shiftKey && selectionIndexes.length > 0) {
            const idx1 = Math.max(selectionIndexes[0], hoverIndex);
            const idx2 = Math.min(selectionIndexes[0], hoverIndex);

            const distance1 = idx1 - idx2;
            const distance2 = currentPoints.length - distance1;

            selectionIndexes.length = 0;
            if (distance1 <= distance2) {
                for (let i = idx2; i <= idx1; i++) {
                    selectionIndexes.push(i);
                }
            } else {
                for (let i = idx1; i < currentPoints.length; i++) {
                    selectionIndexes.push(i);
                }
                for (let i = 0; i <= idx2; i++) {
                    selectionIndexes.push(i);
                }
            }
            render();
            return;
        }

        selectionIndexes.length = 0;
        addHistory(
            "move",
            { ...currentPoints[hoverIndex] },
            currentPoints,
            hoverIndex
        );
        selectionIndexes.push(hoverIndex);
        canvas.onmousemove = (event) =>
            panPoint(event, currentPoints[hoverIndex]);
        canvas.style.cursor = "grabbing";
        return;
    } else if (event.button === 2) {
        canvas.onmousemove = pan;
    }
}

function handleMouseUp() {
    canvas.onmousemove = trackMouse;
    canvas.style.cursor = "crosshair";
}

function pan(event) {
    offset.x += event.movementX;
    offset.y += event.movementY;
    render();
}

function panPoint(event, point) {
    point.x += event.movementX / zoomLevel;
    point.y += event.movementY / zoomLevel;
    render();
}

function createPoint(x, y) {
    if (currentPoints === markerPoints && currentPoints.length === 4) {
        return;
    }

    if (currentPoints === boxPoints && currentPoints.length === 2) {
        return;
    }

    const point = {
        x: (x - offset.x) / zoomLevel,
        y: (y - offset.y) / zoomLevel,
    };

    if (currentPoints.length < 3) {
        addHistory("add", point, currentPoints, currentPoints.length);
        selectionIndexes.length = 0;
        selectionIndexes.push(currentPoints.length);
        currentPoints.push(point);
        render();
        return;
    }

    // varre todos os segmentos e acha o mais proximo, começa com o segmento formado pelo primeiro e ultimo ponto
    let closer = point2Segment(
        point,
        currentPoints[0],
        currentPoints[currentPoints.length - 1]
    );
    let index = currentPoints.length - 1;
    let distance;

    for (let i = 0; i < currentPoints.length - 1; i++) {
        distance = point2Segment(point, currentPoints[i], currentPoints[i + 1]);

        if (distance < closer) {
            closer = distance;
            index = i;
        }
    }

    currentPoints.splice(index + 1, 0, point);
    addHistory("add", point, currentPoints, index + 1);
    selectionIndexes.length = 0;
    selectionIndexes.push(index + 1);
    render();
}

function toCanvasCoords(point) {
    return {
        x: point.x * zoomLevel + offset.x,
        y: point.y * zoomLevel + offset.y,
    };
}

function hitCircle(mouse, point) {
    const ctxPoint = toCanvasCoords(point);
    return l1Distance(mouse, ctxPoint) < RADIUS + RADIUS;
}

function l1Distance(p1, p2) {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

function point2Segment(target, p1, p2) {
    const vec1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const vec2 = { x: target.x - p1.x, y: target.y - p1.y };

    // find projection of vec2 onto vec1: vec2 = lambda * vec1
    // make lambda between 0 and 1 so that the projection is between p1 and p2
    let lambda =
        (vec1.x * vec2.x + vec1.y * vec2.y) /
        (vec1.x * vec1.x + vec1.y * vec1.y);
    lambda = Math.max(0, Math.min(1, lambda));
    const closerPt = { x: p1.x + lambda * vec1.x, y: p1.y + lambda * vec1.y };
    return l1Distance(target, closerPt);
}

function removePoint() {
    if (hoverIndex >= 0) {
        addHistory(
            "remove",
            currentPoints[hoverIndex],
            currentPoints,
            hoverIndex
        );
        currentPoints.splice(hoverIndex, 1);
        hoverIndex = -1;
        render();
        return;
    }
    // nao esta do jeito ideal, assim tem que aptertar ctrl + z varias vezes para desfazer 1 acao de deletar selecionados
    // mas por equanto vai ficar assim
    if (selectionIndexes.length > 0) {
        const pointsToRemove = [];
        for (let i = selectionIndexes.length - 1; i >= 0; i--) {
            pointsToRemove.push(currentPoints[selectionIndexes[i]]);
            addHistory(
                "remove",
                currentPoints[selectionIndexes[i]],
                currentPoints,
                selectionIndexes[i]
            );
        }
        for (let i = selectionIndexes.length - 1; i >= 0; i--) {
            const idx = currentPoints.indexOf(pointsToRemove[i]);
            currentPoints.splice(idx, 1);
        }
        selectionIndexes.length = 0;
        render();
    }
}

function keyDownHandler(event) {
    if (event.ctrlKey) {
        if (event.key === "z") {
            undo();
        } else if (event.key === "y") {
            redo();
        }
        return;
    }

    // let step = 20;
    // if (event.key === 's') {
    //     offset.y -= step;
    //     render();
    // } else if (event.key === 'w') {
    //     offset.y += step;
    //     render();
    // }

    // if (event.key === 'd') {
    //     offset.x -= step;
    //     render();
    // } else if (event.key === 'a') {
    //     offset.x += step;
    //     render();
    // }

    if (event.key === "Delete" || event.key === "z") {
        removePoint();
    } else if (event.key === "c") {
        centerObject();
    } else if (event.key === "v") {
        let idx = (selectionIndexes[0] + 1) % currentPoints.length;
        idx = idx || 0;
        selectionIndexes.length = 0;
        selectionIndexes.push(idx);
        centerPoint();
    } else if (event.key === "x") {
        let idx =
            selectionIndexes[0] > 0
                ? selectionIndexes[0] - 1
                : currentPoints.length - 1;
        idx = idx || 0;
        selectionIndexes.length = 0;
        selectionIndexes.push(idx);

        centerPoint();
    } else if (event.key === "b") {
        showObjects = !showObjects;
        if (showObjects) {
            render();
        } else {
            drawImage();
        }
    } else if (currentPoints === markerPoints) {
        if (event.key === "ArrowLeft" && markerPoints.length > 1) {
            markerPoints.unshift(markerPoints.pop());
            render();
        } else if (event.key === "ArrowRight" && markerPoints.length > 1) {
            markerPoints.push(markerPoints.shift());
            render();
        }
    }
}

function exchangeKeydown(event) {
    event.preventDefault();

    if (event.key === "Enter") {
        const regex = /([1-4]+);([1-4])/;
        const match = regex.exec(exchange.value);
        if (!match || match.length < 3) {
            return;
        }

        const first = parseInt(match[1]) - 1;
        const second = parseInt(match[2]) - 1;

        if (
            Math.max(first, second) >= markerPoints.length ||
            Math.min(first, second) < 0
        ) {
            return;
        }

        const temp = markerPoints[first];
        markerPoints[first] = markerPoints[second];
        markerPoints[second] = temp;
        render();
    }

    if (!EXCHANGE_ALLOWED_KEYS.includes(event.key)) {
        return;
    }

    if (event.key === "Backspace") {
        if (exchange.value.length === 3) {
            exchange.value = exchange.value.slice(0, 2);
            return;
        }
        exchange.value = "";
        return;
    }

    let value = exchange.value + event.key;

    if (value.length === 1) {
        value += ";";
    } else if (value.length > 3) {
        return;
    }

    exchange.value = value;
}

// todo: as i have to use this tack mouse, this should function should the only one assigend to canvas.onmousemove
function trackMouse(event) {
    mousePos.x = event.offsetX;
    mousePos.y = event.offsetY;

    for (let i = 0; i < currentPoints.length; i++) {
        if (hitCircle(mousePos, currentPoints[i])) {
            hoverIndex = i;
            canvas.style.cursor = "pointer";
            render();
            return;
        }
    }
    if (hoverIndex > -1) {
        hoverIndex = -1;
        canvas.style.cursor = "crosshair";
        render();
    }
}

function addHistory(type, point, selectedPoints, index) {
    undoStack.push({ type, point, selectedPoints, index });
    if (undoStack.length > MAX_STACK_SIZE) {
        undoStack.shift();
    }
}

function undo() {
    if (undoStack.length > 0) {
        const step = undoStack.pop();
        const { type, point, selectedPoints, index } = step;

        redoStack.push(step);
        if (redoStack.length > MAX_STACK_SIZE) {
            redoStack.shift();
        }

        if (type === "add") {
            selectedPoints.splice(index, 1);
        } else if (type === "remove") {
            selectedPoints.splice(index, 0, point);
        } else if (type === "move") {
            const { x, y } = selectedPoints[index];
            selectedPoints[index].x = point.x;
            selectedPoints[index].y = point.y;
            point.x = x;
            point.y = y;
        }
        render();
    }
}

function redo() {
    if (redoStack.length > 0) {
        const { type, point, selectedPoints, index } = redoStack.pop();

        undoStack.push({ type, point, selectedPoints, index });
        if (undoStack.length > MAX_STACK_SIZE) {
            undoStack.shift();
        }

        if (type === "add") {
            selectedPoints.splice(index, 0, point);
        } else if (type === "remove") {
            selectedPoints.splice(index, 1);
        } else if (type === "move") {
            const { x, y } = selectedPoints[index];
            selectedPoints[index].x = point.x;
            selectedPoints[index].y = point.y;
            point.x = x;
            point.y = y;
        }

        render();
    }
}

KeyboardMover.init(offset, render);

canvas.onmousemove = trackMouse;
canvas.addEventListener("wheel", handleZoom);
canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mouseup", handleMouseUp);
canvas.addEventListener("mouseleave", () => (canvas.onmousemove = trackMouse));
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

exchange.addEventListener("keydown", exchangeKeydown);

window.addEventListener("keydown", keyDownHandler);
