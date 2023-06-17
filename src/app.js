const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const display = document.querySelector('.display');
const exchange = document.querySelector('#exchange');
const image = new Image();
const offset = { x: 0, y: 0 };
const zoomFactor = 0.1;
const undoStack = [];
const redoStack = [];

const START_ARC = 0;
const END_ARC = 2 * Math.PI;
const RADIUS = 5;
const MAX_ZOOM = 8;
const MARKER_COLORS = ["#f00", "#070", "#00f", "#950"];
const EXCHANGE_ALLOWED_KEYS = ["1", "2", "3", "4", "Backspace", "Enter"];
const MAX_STACK_SIZE = 20;

// altura da imagem em pixels, normalizamos os pontos para ficarem entre 0 e 1
export const NORMALIZER = 4624;
export const IMAGE_MAP = {}
export const CLASSES = {
    MARKER: 0,
    LEAF: 1,
}

let zoomLevel = 1;
let markerPoints = [];
let leafPoints = [];
let selectedPoints = markerPoints;
let focusIndex = -1;
let mousePos = { x: 0, y: 0 };
let currentClass = CLASSES.MARKER;


export function setSelectedPoints(option) {
    if (option == CLASSES.MARKER) {
        selectedPoints = markerPoints;
        currentClass = CLASSES.MARKER;
        exchange.parentElement.classList.remove('hide')
    } else if (option == CLASSES.LEAF) {
        selectedPoints = leafPoints;
        currentClass = CLASSES.LEAF;
        exchange.parentElement.classList.add('hide')
    } else {
        setSelectedPoints(currentClass);
        return;
    }
    render();
}

function pointsFromEntry(entry, tag) {
    return new Promise((resolve, reject) => {
        entry.file((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target.result;
                const parser = new DOMParser();
                const xml = parser.parseFromString(src, 'text/xml');
                const corners = xml.getElementsByTagName(tag)[0].children;
                const pts = [];

                for (let i = 0; i < corners.length; i += 2) {
                    const point = {
                        x: parseFloat(corners[i].textContent) * NORMALIZER,
                        y: parseFloat(corners[i + 1].textContent) * NORMALIZER,
                    }
                    pts.push(point);
                }

                resolve(pts);
            }
            reader.readAsText(file);
        });
    });
}

export async function loadImage(fileEntry, marker, leaf) {
    const img = IMAGE_MAP[fileEntry.name];

    if (img) {
        image.src = img.src;
        markerPoints = img.markerPoints;
        leafPoints = img.leafPoints;
        setSelectedPoints();
        return;
    }

    markerPoints = !marker ? [] : await pointsFromEntry(marker, "corners");
    leafPoints = !leaf ? [] : await pointsFromEntry(leaf, "points");

    fileEntry.file((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target.result;
            image.src = src;
            IMAGE_MAP[fileEntry.name] = { src, markerPoints, leafPoints }
            setSelectedPoints();
        };
        reader.readAsDataURL(file);
    });
    focusIndex = -1;
}

image.addEventListener('load', setCanvas);

function setCanvas() {
    const imageAspectRatio = image.width / image.height;
    const screenHeight = display.clientHeight * 0.8;
    const screenWidth = screenHeight * imageAspectRatio;

    canvas.width = display.clientWidth;
    canvas.height = display.clientHeight;
    zoomLevel = screenHeight / image.height;
    offset.x = (canvas.width - screenWidth) * 0.5;
    offset.y = (canvas.height - screenHeight) * 0.5;
    render();
}

function centerObject() {
    const x0 = Math.min(...selectedPoints.map(p => p.x));
    const x1 = Math.max(...selectedPoints.map(p => p.x));
    const y0 = Math.min(...selectedPoints.map(p => p.y));
    const y1 = Math.max(...selectedPoints.map(p => p.y));
    const width = x1 - x0;
    const height = y1 - y0;
    const aspectRation = width / height;
    const screenHeight = display.clientHeight * 0.8;
    const screenWidth = screenHeight * aspectRation;
    canvas.width = display.clientWidth;
    canvas.height = display.clientHeight;
    zoomLevel = screenHeight / height;
    offset.x = (canvas.width - screenWidth) * 0.5 - x0 * zoomLevel;
    offset.y = (canvas.height - screenHeight) * 0.5 - y0 * zoomLevel;
    render();
}

function centerPoint() {
    zoomLevel = MAX_ZOOM;
    offset.x = -selectedPoints[focusIndex].x * zoomLevel + canvas.width * 0.5;
    offset.y = -selectedPoints[focusIndex].y * zoomLevel + canvas.height * 0.5;
    render();
}

document.getElementById('reset-button').onclick = setCanvas;
setCanvas();

function render() {
    requestAnimationFrame(draw)
}

function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, offset.x, offset.y, image.width * zoomLevel, image.height * zoomLevel);

    drawMarker();
    drawLeaf();
}

function drawMarker() {
    ctx.fillStyle = 'rgba(0, 200, 200, 0.4)';

    drawPolygon(markerPoints);

    if (selectedPoints == markerPoints) {
        let ctxPoint;
        ctx.font = "20px serif";
        for (let i = 0; i < markerPoints.length && i < 4; i++) {
            ctx.strokeStyle = MARKER_COLORS[i];
            ctx.lineWidth = 3;
            ctxPoint = toCanvasCoords(markerPoints[i]);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.closePath();
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.strokeText(`${i + 1}`, ctxPoint.x + 15, ctxPoint.y + 10);
        }
    }
}

function drawLeaf() {
    ctx.strokeStyle = '#A02';
    ctx.fillStyle = 'rgba(200, 0, 0, 0.5)';
    ctx.lineWidth = 3;

    drawPolygon(leafPoints);

    if (selectedPoints == leafPoints) {
        let ctxPoint;
        for (let point of leafPoints) {
            ctxPoint = toCanvasCoords(point);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, RADIUS, START_ARC, END_ARC);
            ctx.closePath();
            ctx.stroke();
        }
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

function handleZoom(event) {
    let scale = event.deltaY > 0 ? 1 - zoomFactor : 1 + zoomFactor;
    let oldLevel = zoomLevel;
    zoomLevel = Math.max(0.1, zoomLevel * scale);
    zoomLevel = Math.min(MAX_ZOOM, zoomLevel);

    // vc quer achar o ponto que o mouse estava sobre na imagem escalada com o novo zoom
    // e substrair esse ponto do ponto que o mouse aponta atualmente e esse é o seu offset
    // p_old = (x - a, y - b) / zoom_old; p_new = zoom_new * p_old; offset = p_mouse - p_new;
    const zoomRatio = zoomLevel / oldLevel;
    const mouse = { x: event.offsetX, y: event.offsetY };
    offset.x = mouse.x - zoomRatio * (mouse.x - offset.x);
    offset.y = mouse.y - zoomRatio * (mouse.y - offset.y);

    render();
}

function handleMouseDown(event) {
    const mouse = { x: event.offsetX, y: event.offsetY };
    if (event.button == 0) {
        // for (let point of selectedPoints) {
        //     if (hitCircle(mouse, point)) {
        //         canvas.onmousemove = (event) => panPoint(event, point);
        //         canvas.style.cursor = 'grabbing';
        //         return;
        //     }
        // }
        // rewrite for usin let let i = 0; i < selectedPoints.length; i++
        for (let i = 0; i < selectedPoints.length; i++) {
            if (hitCircle(mouse, selectedPoints[i])) {
                addHistory("move", { ...selectedPoints[i] }, selectedPoints, i);
                canvas.onmousemove = (event) => panPoint(event, selectedPoints[i]);
                canvas.style.cursor = 'grabbing';
                return;
            }
        }

        createPoint(event.offsetX, event.offsetY);
    }
    else if (event.button == 2) {
        canvas.onmousemove = pan;
    }
}

function handleMouseUp() {
    canvas.onmousemove = trackMouse;
    canvas.style.cursor = 'crosshair';
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
    if (selectedPoints == markerPoints && selectedPoints.length == 4) {
        return;
    }

    const point = {
        x: (x - offset.x) / zoomLevel,
        y: (y - offset.y) / zoomLevel,
    };

    if (selectedPoints.length < 3) {
        addHistory("add", point, selectedPoints, selectedPoints.length);
        selectedPoints.push(point);
        render();
        return;
    }


    // varre todos os segmentos e acha o mais proximo, começa com o segmento formado pelo primeiro e ultimo ponto
    let closer = point2Segment(point, selectedPoints[0], selectedPoints[selectedPoints.length - 1]);
    let index = selectedPoints.length - 1;
    let distance;

    for (let i = 0; i < selectedPoints.length - 1; i++) {
        distance = point2Segment(point, selectedPoints[i], selectedPoints[i + 1])

        if (distance < closer) {
            closer = distance;
            index = i;
        }
    }

    selectedPoints.splice(index + 1, 0, point);
    addHistory("add", point, selectedPoints, index + 1);
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
    return l1Distance(mouse, ctxPoint) < (RADIUS + RADIUS);
}

function l1Distance(p1, p2) {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

function point2Segment(target, p1, p2) {
    let vec1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    let vec2 = { x: target.x - p1.x, y: target.y - p1.y };

    // find projection of vec2 onto vec1: vec2 = lambda * vec1
    // make lambda between 0 and 1 so that the projection is between p1 and p2
    let lambda = (vec1.x * vec2.x + vec1.y * vec2.y) / (vec1.x * vec1.x + vec1.y * vec1.y);
    lambda = Math.max(0, Math.min(1, lambda));
    let closerPt = { x: p1.x + lambda * vec1.x, y: p1.y + lambda * vec1.y };
    return l1Distance(target, closerPt);
}

function removePoint() {
    for (let i = 0; i < selectedPoints.length; i++) {
        if (hitCircle(mousePos, selectedPoints[i])) {
            addHistory("remove", selectedPoints[i], selectedPoints, i);
            selectedPoints.splice(i, 1);
            render();
            return;
        }
    }
}

function keyDownHandler(event) {
    if (event.ctrlKey) {
        if (event.key == 'z') {
            undo();
        } else if (event.key == 'y') {
            redo();
        }
        return;
    }

    if (event.key == 'Delete') {
        removePoint();
    }
    else if (event.key == 'c') {
        centerObject();
    }
    else if (event.key == 'v') {
        focusIndex += 1;
        focusIndex %= selectedPoints.length;
        centerPoint();
    }
    else if (event.key == 'x') {
        focusIndex -= 1;
        if (focusIndex < 0) {
            focusIndex = selectedPoints.length - 1;
        }
        centerPoint();
    }
    else if (selectedPoints === markerPoints) {
        if (event.key == 'ArrowLeft' && markerPoints.length > 1) {
            markerPoints.unshift(markerPoints.pop())
            render();
        } else if (event.key == 'ArrowRight' && markerPoints.length > 1) {
            markerPoints.push(markerPoints.shift())
            render();
        }
        else if (document.activeElement != exchange && EXCHANGE_ALLOWED_KEYS.includes(event.key)) {
            exchange.focus();
            exchangeKeydown(event);
        }
    }
}

function exchangeKeydown(event) {
    event.preventDefault();

    if (event.key == 'Enter') {
        const regex = /([1-4]+);([1-4])/;
        const match = regex.exec(exchange.value);
        if (!match || match.length < 3) {
            return;
        }

        const first = parseInt(match[1]) - 1;
        const second = parseInt(match[2]) - 1;

        if (Math.max(first, second) >= markerPoints.length || Math.min(first, second) < 0) {
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

    if (event.key == 'Backspace') {
        if (exchange.value.length == 3) {
            exchange.value = exchange.value.slice(0, 2);
            return;
        }
        exchange.value = "";
        return;
    }

    let value = exchange.value + event.key;

    if (value.length == 1) {
        value += ';';
    } else if (value.length > 3) {
        return;
    }

    exchange.value = value;
}

// todo: as i have to use this tack mouse, this should function should the only one assigend to canvas.onmousemove
function trackMouse(event) {
    mousePos.x = event.offsetX;
    mousePos.y = event.offsetY;
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

        if (type == "add") {
            selectedPoints.splice(index, 1);
        } else if (type == "remove") {
            selectedPoints.splice(index, 0, point);
        } else if (type == "move") {
            let { x, y } = selectedPoints[index];
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

        if (type == "add") {
            selectedPoints.splice(index, 0, point);
        }
        else if (type == "remove") {
            selectedPoints.splice(index, 1);
        } else if (type == "move") {
            let { x, y } = selectedPoints[index];
            selectedPoints[index].x = point.x;
            selectedPoints[index].y = point.y;
            point.x = x;
            point.y = y;
        }

        render();
    }
}


canvas.onmousemove = trackMouse;
canvas.addEventListener('wheel', handleZoom);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', (event) => canvas.onmousemove = trackMouse);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

exchange.addEventListener('keydown', exchangeKeydown);

window.addEventListener('keydown', keyDownHandler);