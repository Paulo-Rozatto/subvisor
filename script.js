const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const image = new Image();
const points = [];
const offset = { x: 0, y: 0 };
const zoomSpeed = 0.02;

const START_ARC = 0;
const END_ARC = 2 * Math.PI;
const RADIUS = 5;
const MAX_ZOOM = 3;

let zoomLevel = 1;

// Load the image
image.src = 'image.jpg';
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

function render() {
    requestAnimationFrame(draw)
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, offset.x, offset.y, image.width * zoomLevel, image.height * zoomLevel);

        ctx.strokeStyle = '#F07';
        ctx.lineWidth = 2;
        let ctxPoint;
        for (let point of points) {
            ctxPoint = toCanvasCoords(point);
            ctx.beginPath();
            ctx.arc(ctxPoint.x, ctxPoint.y, 5, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.stroke();
        }

        if (points.length > 2) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.moveTo(ctxPoint.x, ctxPoint.y);
            for (let point of points) {
                ctxPoint = toCanvasCoords(point);
                ctx.lineTo(ctxPoint.x, ctxPoint.y);
            }
            ctx.closePath();
            ctx.fill();
        }
}

function handleZoom(event) {
    let scale = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;
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

    if (points.length < 3) {
        points.push(point);
        render();
        return;
    }

    // calcula a distancia entre o ponto e o ponto medio de cada segmento
    // insere o ponto no segmento mais proximo do ponto medio
    // comeca pelo segmento formado pelo primeiro e ultimo ponto
    let mediumPoint = { x: 0, y: 0 }
    mediumPoint.x = (points[0].x + points[points.length - 1].x) * 0.5;
    mediumPoint.y = (points[0].y + points[points.length - 1].y) * 0.5;

    let closer = l1Distance(mediumPoint, point);
    let index = points.length - 1;
    let distance;

    for (let i = 0; i < points.length - 1; i++) {
        mediumPoint.x = (points[i].x + points[i + 1].x) * 0.5;
        mediumPoint.y = (points[i].y + points[i + 1].y) * 0.5;
        distance = l1Distance(mediumPoint, point);

        if (distance < closer) {
            closer = distance;
            index = i;
        }
    }

    points.splice(index + 1, 0, point);
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
    return l1Distance(mouse, ctxPoint) < (RADIUS + RADIUS);
}

function l1Distance(p1, p2) {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

canvas.addEventListener('wheel', handleZoom);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});