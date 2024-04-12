import { canvas, getZoom, window2canvas } from "./renderer";

const dropZone = document.querySelector(".drop-zone");

const auxPt = { x: 0, y: 0 };
let currentModal;

export function modalToggle(modal) {
    currentModal = modal;

    if (dropZone.classList.contains("hide")) {
        dropZone.classList.remove("hide");
        modal?.classList.remove("hide");
    } else {
        dropZone.classList.add("hide");
        modal?.classList.add("hide");
    }
}

dropZone.addEventListener("click", () => modalToggle(currentModal));

export const MOUSE = {
    get left() {
        return 1;
    },
    get right() {
        return 2;
    },
    get middle() {
        return 4;
    },
};

export function l1Distance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

export function normalize(vec, dst = {}) {
    const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    dst.x = vec.x / length;
    dst.y = vec.y / length;
    return dst;
}

export function add(vec1, vec2, dst = {}) {
    dst.x = vec1.x + vec2.x;
    dst.y = vec1.y + vec2.y;
    return dst;
}

export function sub(vec1, vec2, dst = {}) {
    dst.x = vec1.x - vec2.x;
    dst.y = vec1.y - vec2.y;
    return dst;
}

export function scale(vec, scalar, dst) {
    dst.x = vec.x * scalar;
    dst.y = vec.y * scalar;
    return dst;
}

export function getFullAngle(vec, center) {
    let angle = Math.atan2(vec.y - center.y, vec.x - center.x);
    if (angle < 0) {
        angle += 2 * Math.PI;
    }
    return angle;
}

export function getArea(polygon) {
    if (polygon?.length === 0) {
        return;
    }

    let totalArea = 0;

    for (let i = 0; i < polygon.length; i++) {
        const currentVertex = polygon[i];
        const nextVertex = polygon[(i + 1) % polygon.length];

        const partialArea =
            currentVertex.x * nextVertex.y - nextVertex.x * currentVertex.y;
        totalArea += partialArea;
    }

    totalArea *= 0.5;

    return Math.abs(totalArea);
}

export function getCenterOfMass(polyPoints) {
    if (polyPoints?.length === 0) {
        return;
    }

    let totalArea = 0;
    let centerX = 0;
    let centerY = 0;

    for (let i = 0; i < polyPoints.length; i++) {
        const currentVertex = polyPoints[i];
        const nextVertex = polyPoints[(i + 1) % polyPoints.length];

        const partialArea =
            currentVertex.x * nextVertex.y - nextVertex.x * currentVertex.y;
        totalArea += partialArea;
        centerX += (currentVertex.x + nextVertex.x) * partialArea;
        centerY += (currentVertex.y + nextVertex.y) * partialArea;
    }

    totalArea *= 0.5;

    if (totalArea !== 0) {
        centerX /= 6 * totalArea;
        centerY /= 6 * totalArea;
    } else {
        // The polygon has zero area, set center to the first vertex
        centerX = polyPoints[0].x;
        centerY = polyPoints[0].y;
    }

    return { x: centerX, y: centerY };
}

export function findMinMaxPoints(polygon) {
    if (polygon?.length === 0) {
        return null;
    }
    const min = { ...polygon[0] };
    const max = { ...polygon[0] };

    for (let i = 1; i < polygon.length; i++) {
        if (polygon[i].x < min.x) {
            min.x = polygon[i].x;
        } else if (polygon[i].x > max.x) {
            max.x = polygon[i].x;
        }

        if (polygon[i].y < min.y) {
            min.y = polygon[i].y;
        } else if (polygon[i].y > max.y) {
            max.y = polygon[i].y;
        }
    }

    return { min, max };
}

export function getBoudingBox(polygon) {
    const { min, max } = findMinMaxPoints(polygon);

    return [min.x, min.y, max.x - min.x, max.y - min.y];
}

export function event2canvas(e, dst) {
    auxPt.x = e.offsetX;
    auxPt.y = e.offsetY;
    window2canvas(auxPt, dst);
}

export function hoverPoints(e, polygon, hover) {
    if (!polygon) {
        return false;
    }

    const l = polygon.points.length;
    let pt;

    event2canvas(e, auxPt);

    for (let i = 0; i < l; i++) {
        pt = polygon.points[i];
        pt.hovered = false;
        if (l1Distance(pt.x, pt.y, auxPt.x, auxPt.y) * getZoom() < 15) {
            hover.point = pt;
            hover.polygon = null;
            canvas.style.cursor = "pointer";
            polygon.dirty = true;
            return i;
        }
    }

    hover.point = null;
    return -1;
}

export function points2String(pointsArray) {
    return pointsArray
        .map((p) => `${parseInt(p.x)},${parseInt(p.y)}`)
        .join(",");
}

// i'm not really using this now, maybe remove?
export function debounce(callback, time) {
    let timeoutCallback, timeoutClear;
    let args;
    const clear = () => (timeoutCallback = null);

    return (...params) => {
        if (timeoutCallback) {
            clearTimeout(timeoutCallback);
            clearTimeout(timeoutClear);
        } else {
            args = params;
        }

        timeoutClear = setTimeout(clear, time);
        timeoutCallback = setTimeout(callback.bind(null, ...args), time);
    };
}

export function throttle(callback, time, ...params) {
    let isPaused = false;

    const togglePause = () => {
        isPaused = !isPaused;
    };

    return (...args) => {
        if (isPaused) {
            return;
        }
        togglePause();
        callback(...args, ...params);
        setTimeout(togglePause, time);
    };
}
