const canvas = document.getElementById('canvas');
const resetButton = document.getElementById('resetButton');
const ctx = canvas.getContext('2d');
const image = new Image();
const offset = { x: 0, y: 0 };
const drag = { x: 0, y: 0 };

const zoomSpeed = 0.01;

let zoomLevel = 1;
let isPanning = false;

// Load the image
image.src = 'image.jpg';
image.addEventListener('load', () => {
    setCanvas();
    render();
});

function setCanvas() {
    const imageAspectRatio = image.width / image.height;
    const screenHeight = window.innerHeight * 0.8;
    const screenWidth = screenHeight * imageAspectRatio;

    canvas.width = screenWidth;
    canvas.height = screenHeight;
    zoomLevel = screenWidth / image.width;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, offset.x, offset.y, image.width * zoomLevel, image.height * zoomLevel);
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
    if (event.button == 2) {
        isPanning = true;
        canvas.onmousemove = pan;
    }
}

function handleMouseUp(event) {
    if (event.button == 2) {
        isPanning = false;
        canvas.onmousemove = null;
    }
}

function pan(event) {
    offset.x += event.movementX;
    offset.y += event.movementY;
    render();
}

canvas.addEventListener('wheel', handleZoom);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});