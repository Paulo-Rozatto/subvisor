import { add, getCenterOfMass, normalize, scale, sub } from "./utils";
import { SettingsHandler as settings } from "./handlers/settings-handler";
import { updateZoom } from "./handlers/infos-handler";

export const canvas = document.querySelector("#canvas");
export const ctx = canvas.getContext("2d");
const display = document.querySelector(".display");
const image = new Image();

// main settings
const offset = { x: 0, y: 0 };
let zoom = 1;

// main objects
let polygons = [];
let spinners = [];

// aux
const HOVER_COLOR = "#a5db94";
const auxPt = { x: 0, y: 0 };
const PI2 = Math.PI * 2;
let isSpinning = false;

export function window2canvas(src, dst) {
    dst.x = (src.x - offset.x) / zoom;
    dst.y = (src.y - offset.y) / zoom;
}

export function origin2canvas(src, dst) {
    dst.x = src.x * zoom + offset.x;
    dst.y = src.y * zoom + offset.y;
}

function draw(timestamp) {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        image,
        offset.x,
        offset.y,
        image.width * zoom,
        image.height * zoom
    );

    let poly;
    let l = polygons.length;
    for (let i = 0; i < l; i++) {
        poly = polygons[i];

        const m = poly.points.length;

        if (!poly.unfilled && m > 0) {
            // FILL POLYGON
            ctx.fillStyle = poly.class.color + settings.opacityHex;

            poly.path = new Path2D();
            origin2canvas(poly.points[0], auxPt);
            poly.path.moveTo(auxPt.x, auxPt.y);

            for (let j = 1; j < m; j++) {
                origin2canvas(poly.points[j], auxPt);
                poly.path.lineTo(auxPt.x, auxPt.y);
            }
            poly.path.closePath();
            ctx.fill(poly.path);

            // PAINT OUTLINE IF HOVERED OR FOCUSED
            if (!poly.focused && poly.hovered) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = HOVER_COLOR;
                ctx.stroke(poly.path);
            } else if (poly.outline) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = poly.class.color;
                ctx.stroke(poly.path);
            }
        }

        // PAINT VERTICES IF ENABLED
        if (poly.showPoints) {
            const selectedPath = new Path2D();
            ctx.beginPath();
            ctx.fillStyle = poly.class.color;
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;

            for (let j = 0; j < m; j++) {
                origin2canvas(poly.points[j], auxPt);
                ctx.moveTo(auxPt.x + 5, auxPt.y);
                ctx.arc(auxPt.x, auxPt.y, 5, 0, PI2);

                if (poly.points[j].hovered || poly.points[j].focused) {
                    selectedPath.moveTo(auxPt.x + 5, auxPt.y);
                    selectedPath.arc(auxPt.x, auxPt.y, 5, 0, PI2);
                }
            }
            ctx.stroke();
            ctx.fill();

            ctx.lineWidth = 3;
            ctx.strokeStyle = HOVER_COLOR;
            ctx.stroke(selectedPath);

            // PAINT NUMBERS IF ENABLED
            if (poly.class.enumerate) {
                ctx.font = "20px sans";
                ctx.textAlign = "center";
                ctx.textBaseline = "baseline";

                ctx.fillStyle = poly.class.color;
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 2;

                if (poly.dirty) {
                    poly.center = getCenterOfMass(poly.points);
                    poly.dirty = false;
                }

                const dir = { x: 0, y: 0 };
                let numString;
                for (let j = 0; j < m; j++) {
                    sub(poly.points[j], poly.center, dir);
                    normalize(dir, dir);
                    scale(dir, 20, dir);

                    origin2canvas(poly.points[j], auxPt);
                    add(auxPt, dir, auxPt);

                    numString = (j + 1).toString();
                    ctx.strokeText(numString, auxPt.x, auxPt.y);
                    ctx.fillText(numString, auxPt.x, auxPt.y);
                }
            }
        }
    }

    l = spinners.length;
    for (let i = 0; i < l; i++) {
        ctx.fillStyle = HOVER_COLOR;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 10;
        origin2canvas(spinners[i], auxPt);

        ctx.beginPath();
        const start = timestamp * 0.005;
        const end = start + PI2 - 0.5;
        ctx.arc(auxPt.x, auxPt.y, 15, start, end);

        ctx.stroke();

        ctx.lineWidth = 5;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
    }

    isSpinning = l > 0;
    if (isSpinning) {
        requestAnimationFrame(draw);
    }
}

export function render() {
    if (isSpinning) {
        return;
    }
    requestAnimationFrame(draw);
}

export function focusCanvas() {
    canvas.focus();
}

function set(polyArray) {
    if (!Array.isArray(polyArray)) {
        return;
    }
    polygons = polyArray;
    polygons.forEach((el) => (el.dirty = true));
}

export function setImage(_image) {
    if (!_image?.src) {
        console.warn("Missing image or image src");
        return;
    }

    set(_image.annotations);
    image.src = _image.src;
    spinners = _image.spinners;
}

function setZoom(_zoom) {
    zoom = _zoom;
    updateZoom(zoom);
}

export function getZoom() {
    return zoom;
}

export function pan(dx, dy) {
    offset.x += dx;
    offset.y += dy;
}

export function wheelZoom(e) {
    const scale = e.deltaY > 0 ? 1 - settings.stepZoom : 1 + settings.stepZoom;
    const oldZoom = zoom;
    let newZoom = Math.max(0.1, zoom * scale);
    newZoom = Math.min(settings.maxZoom, newZoom);
    setZoom(newZoom);

    const zoomRatio = newZoom / oldZoom;
    offset.x = e.offsetX - zoomRatio * (e.offsetX - offset.x);
    offset.y = e.offsetY - zoomRatio * (e.offsetY - offset.y);
}

export function reset() {
    if (!image.src) {
        return;
    }

    const imageAspectRatio = image.width / image.height;
    const screenHeight = display.clientHeight * 0.8;
    const screenWidth = screenHeight * imageAspectRatio;

    canvas.width = display.clientWidth;
    canvas.height = display.clientHeight;
    setZoom(screenHeight / image.height);
    offset.x = (canvas.width - screenWidth) * 0.5;
    offset.y = (canvas.height - screenHeight) * 0.5;

    focusCanvas();
    render();
}

image.onload = () => {
    reset();
    focusCanvas();
    render();
};
