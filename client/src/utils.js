const dropZone = document.querySelector(".drop-zone");
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

export function l1Distance(p1, p2) {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

export function l2Norm(x, y) {
    const length = Math.sqrt(x ** 2 + y ** 2);
    return { x: x / length, y: y / length };
}

export function pointToSegment(target, p1, p2) {
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

export function getCenterOfMass(polygon) {
    if (polygon?.length === 0) {
        return;
    }

    let totalArea = 0;
    let centerX = 0;
    let centerY = 0;

    for (let i = 0; i < polygon.length; i++) {
        const currentVertex = polygon[i];
        const nextVertex = polygon[(i + 1) % polygon.length];

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
        centerX = polygon[0].x;
        centerY = polygon[0].y;
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
