const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const image = new Image();
const points = [];
const offset = { x: 0, y: 0 };
const zoomSpeed = 0.01;

const START_ARC = 0;
const END_ARC = 2 * Math.PI;
const RADIUS = 10;

let zoomLevel = 1;

// Load the image
image.src = 'image.jpg';
image.addEventListener('load', setCanvas);

function setCanvas() {
    const imageAspectRatio = image.width / image.height;
    const screenHeight = window.innerHeight * 0.8;
    const screenWidth = screenHeight * imageAspectRatio;

    canvas.width = screenWidth;
    canvas.height = screenHeight;
    zoomLevel = screenWidth / image.width;
    offset.x = 0;
    offset.y = 0;
    render();
}

document.getElementById('resetButton').onclick = setCanvas;

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, offset.x, offset.y, image.width * zoomLevel, image.height * zoomLevel);

    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'black';
    let ctxPoint;
    for (let point of points) {
        ctxPoint = toCanvasCoords(point);
        ctx.beginPath();
        ctx.arc(ctxPoint.x, ctxPoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function handleZoom(event) {
    let scale = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;
    let oldLevel = zoomLevel;
    zoomLevel = Math.max(0.1, zoomLevel - scale);
    zoomLevel = Math.min(1, zoomLevel);

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
    if (event.button == 0) {
        for (let point of points) {
            if (hitCircle(event, point)) {
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
    canvas.onmousemove = null;
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
    const point = {
        x: (x - offset.x) / zoomLevel,
        y: (y - offset.y) / zoomLevel,
    };
    points.push(point);
    render();
}

function toCanvasCoords(point) {
    return {
        x: point.x * zoomLevel + offset.x,
        y: point.y * zoomLevel + offset.y,
    };
}

function hitCircle(event, point) {
    const mouse = { x: event.offsetX, y: event.offsetY };
    const ctxPoint = toCanvasCoords(point);
    // l1 distance
    return Math.abs(mouse.x - ctxPoint.x) + Math.abs(mouse.y - ctxPoint.y) < RADIUS
}

canvas.addEventListener('wheel', handleZoom);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});