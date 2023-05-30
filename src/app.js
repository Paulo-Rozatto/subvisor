const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const image = new Image();
const offset = { x: 0, y: 0 };
const zoomSpeed = 0.04;

const START_ARC = 0;
const END_ARC = 2 * Math.PI;
const RADIUS = 5;
const MAX_ZOOM = 5;
const MARKER_COLORS = ["#f00", "#070", "#00f", "#950"];

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
let mousePos = { x: 0, y: 0 };
let currentClass = CLASSES.MARKER;


export function setSelectedPoints(option) {
    if (option == CLASSES.MARKER) {
        selectedPoints = markerPoints;
        currentClass = CLASSES.MARKER;
    } else if (option == CLASSES.LEAF) {
        selectedPoints = leafPoints;
        currentClass = CLASSES.LEAF;
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

    markerPoints = await pointsFromEntry(marker, "corners");
    leafPoints = await pointsFromEntry(leaf, "points");
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
}

image.addEventListener('load', setCanvas);

function setCanvas() {
    const imageAspectRatio = image.width / image.height;
    const screenHeight = window.innerHeight * 0.8;
    const screenWidth = screenHeight * imageAspectRatio;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    zoomLevel = screenHeight / image.height;
    offset.x = (canvas.width - screenWidth) * 0.5;
    offset.y = (canvas.height - screenHeight) * 0.5;
    render();
}

document.getElementById('resetButton').onclick = setCanvas;
setCanvas();

function render() {
    requestAnimationFrame(draw)
}

function draw() {
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
        ctxPoint = toCanvasCoords(points[0]);
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
    let scale = event.deltaY > 0 ? 1.25 * zoomSpeed : -zoomSpeed;
    let oldLevel = zoomLevel;
    zoomLevel = Math.max(0.1, zoomLevel - scale);
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
        for (let point of selectedPoints) {
            if (hitCircle(mouse, point)) {
                canvas.onmousemove = (event) => panPoint(event, point);
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
        selectedPoints.push(point);
        render();
        return;
    }

    // calcula a distancia entre o ponto e o ponto medio de cada segmento
    // insere o ponto no segmento mais proximo do ponto medio
    // comeca pelo segmento formado pelo primeiro e ultimo ponto
    let mediumPoint = { x: 0, y: 0 }
    mediumPoint.x = (selectedPoints[0].x + selectedPoints[selectedPoints.length - 1].x) * 0.5;
    mediumPoint.y = (selectedPoints[0].y + selectedPoints[selectedPoints.length - 1].y) * 0.5;

    let closer = l1Distance(mediumPoint, point);
    let index = selectedPoints.length - 1;
    let distance;

    for (let i = 0; i < selectedPoints.length - 1; i++) {
        mediumPoint.x = (selectedPoints[i].x + selectedPoints[i + 1].x) * 0.5;
        mediumPoint.y = (selectedPoints[i].y + selectedPoints[i + 1].y) * 0.5;
        distance = l1Distance(mediumPoint, point);

        if (distance < closer) {
            closer = distance;
            index = i;
        }
    }

    selectedPoints.splice(index + 1, 0, point);
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

function removePoint() {
    for (let i = 0; i < selectedPoints.length; i++) {
        if (hitCircle(mousePos, selectedPoints[i])) {
            selectedPoints.splice(i, 1);
            render();
            return;
        }
    }
}

function keyDownHandler(event) {
    if (event.key == 'Delete') {
        removePoint();
    }
}

// todo: as i have to use this tack mouse, this should function should the only one assigend to canvas.onmousemove
function trackMouse(event) {
    mousePos.x = event.offsetX;
    mousePos.y = event.offsetY;
}


canvas.onmousemove = trackMouse;
canvas.addEventListener('wheel', handleZoom);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

window.addEventListener('keydown', keyDownHandler);