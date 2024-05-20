import * as hist from "./history.js";

import {
    bisectorNorm,
    event2canvas,
    hoverPoints,
    intersect,
    points2String,
} from "./utils";
import { focusCanvas, render, window2canvas } from "./renderer";
import { annotateLeaf } from "./api-consumer";
import { ClassesHandler as classes } from "./handlers/classes-handler";
import { setUiPolyLength } from "./handlers/infos-handler.js";

let focus, hover, currentMode;

// HELPER OBJECTS

const foreground = {
    points: [],
    class: {
        color: "#00ff00",
    },
    unfilled: true,
    showPoints: true,
};

const background = {
    points: [],
    class: {
        color: "#ff0000",
    },
    unfilled: true,
    showPoints: true,
};

// expose 4 points to draw a box while there's actually 2 points
const boxPoints = () => {
    let x1, x2, y1, y2;

    return [
        {
            get x() {
                return x1;
            },
            set x(x) {
                x1 = x;
            },
            get y() {
                return y1;
            },
            set y(y) {
                y1 = y;
            },
        },
        {
            get x() {
                return x2;
            },
            set x(x) {
                x2 = x;
            },
            get y() {
                return y1;
            },
            set y(y) {
                y1 = y;
            },
        },
        {
            get x() {
                return x2;
            },
            set x(x) {
                x2 = x;
            },
            get y() {
                return y2;
            },
            set y(y) {
                y2 = y;
            },
        },
        {
            get x() {
                return x1;
            },
            set x(x) {
                x1 = x;
            },
            get y() {
                return y2;
            },
            set y(y) {
                y2 = y;
            },
        },
    ];
};

const box = {
    points: boxPoints(),
    class: {
        color: "#0f0f99",
    },
    outline: true,
    showPoints: true,

    get hovered() {
        return false;
    },
};

// PREDICT FUNCTION
async function predictAnnotation(promptPoints, promptLabels, spinner) {
    const image = focus.image;
    const polygon = focus.polygon;

    if (image === null) {
        return;
    }

    const promptPoly = polygon ? points2String(polygon.points) : "";

    image.spinners.push(spinner);
    render();

    const newPoints = await annotateLeaf(
        image.filePath,
        promptPoly,
        promptPoints,
        promptLabels
    );

    const idx = image.spinners.indexOf(spinner);
    image.spinners.splice(idx, 1);

    if (!newPoints) {
        return;
    }

    hist.push(image, polygon);
    image.saved = false;

    let ann;
    if (polygon !== null) {
        ann = polygon;
    } else {
        ann = {
            class: classes.current,
        };

        image.annotations.push(ann);
    }

    ann.points = newPoints;

    if (image !== focus.image) {
        return;
    }

    focus.polygon = ann;
    focus.polygon.outline = true;
    render();
    setUiPolyLength(newPoints.length);
}

// TOOLS

const Edit = {
    _poly: null,

    activate() {
        this.onFocus(focus.polygon);
    },

    deactivate() {
        if (this._poly !== null) {
            this._poly.showPoints = false;
        }
    },

    reset() {},

    onFocus(poly) {
        if (this._poly !== null) {
            this._poly.showPoints = false;
        }

        if (poly !== null) {
            poly.showPoints = true;
        }

        this._poly = poly;
    },

    onClick(e, poly) {
        if (focus.image === null) {
            return;
        }

        const newPoint = { x: e.offsetX, y: e.offsetY };
        window2canvas(newPoint, newPoint);

        if (poly === null) {
            const ann = {
                class: classes.current || classes.default,
                showPoints: true,
                points: [newPoint],
            };
            focus.polygon = ann;
            focus.image.annotations.push(ann);
            focus.image.saved = false;
            this.onFocus(ann);

            focus.point = newPoint;
            hover.point = null;
            return;
        }

        if (poly.class.limit && poly.points.length >= poly.class.limit) {
            return;
        }

        hist.push(focus.image, poly);
        focus.image.saved = false;

        const l = poly.points.length;
        const points = poly.points;

        if (l < 3) {
            poly.points.push(newPoint);
        } else {
            let distance = Number.POSITIVE_INFINITY;
            let closer = Number.POSITIVE_INFINITY;
            let index = l - 1;

            let iCurr, iNext, jCurr, jNext;
            let intersects = false;
            for (let i = 0; i < l; i++) {
                iCurr = points[i % l];
                iNext = points[(i + 1) % l];

                distance = bisectorNorm(newPoint, iCurr, iNext);

                if (distance < closer) {
                    intersects = false;
                    for (let j = 0; j < l; j++) {
                        if (j === i) {
                            continue;
                        }

                        jCurr = points[j % l];
                        jNext = points[(j + 1) % l];

                        intersects =
                            intersect(newPoint, iCurr, jCurr, jNext) ||
                            intersect(newPoint, iNext, jCurr, jNext);

                        if (intersects) {
                            break;
                        }
                    }

                    if (intersects) {
                        continue;
                    }

                    closer = distance;
                    index = i;
                }
            }
            points.splice(index + 1, 0, newPoint);
        }

        focus.point = newPoint;
        hover.point = null;
    },

    onMove(e) {
        hoverPoints(e, this._poly, hover);
    },

    onEnter() {},

    onDelete() {
        let idx;

        hist.push(focus.image, focus.polygon);
        focus.image.saved = false;

        const multi = focus.multiFocus;
        if (focus.polygon.points.length - multi.length - 1 < 3) {
            idx = focus.image.annotations.indexOf(focus.polygon);

            if (idx > -1) {
                focus.image.annotations.splice(idx, 1);
            }
            focus.polygon = null;
            return;
        }

        idx = focus.polygon.points.indexOf(focus.point);
        if (idx > -1) {
            focus.polygon.points.splice(idx, 1);
        }

        for (let i = 0; i < multi.length; i++) {
            idx = focus.polygon.points.indexOf(multi[i]);
            if (idx > -1) {
                focus.polygon.points.splice(idx, 1);
            }
        }
        focus.point = null;
    },
};

const PredictPoints = {
    _poly: null,

    activate() {
        focus.image.annotations.push(foreground);
        focus.image.annotations.push(background);

        this.onFocus(focus.polygon);
    },

    deactivate() {
        let idx = focus.image.annotations.indexOf(foreground);

        focus.image.annotations.splice(idx, 1);

        idx = focus.image.annotations.indexOf(background);
        focus.image.annotations.splice(idx, 1);

        if (this._poly) {
            this._poly.outline = false;
        }
    },

    reset() {
        foreground.points.length = 0;
        background.points.length = 0;
    },

    onFocus(poly) {
        if (this._poly !== null) {
            this._poly.outline = false;
        }

        if (poly !== null) {
            poly.outline = true;
        }

        this.reset();
        this._poly = poly;
    },

    onClick(e) {
        const newPoint = { x: e.offsetX, y: e.offsetY };
        window2canvas(newPoint, newPoint);

        if (e.ctrlKey) {
            background.points.push(newPoint);
        } else {
            foreground.points.push(newPoint);
        }

        focus.point = newPoint;
        hover.point = null;
    },

    onMove(e) {
        hoverPoints(e, foreground, hover) !== -1 ||
            hoverPoints(e, background, hover) !== -1;
    },

    onEnter() {
        if (foreground.points.length > 0 || background.points.length > 0) {
            const allPoints = [...foreground.points, ...background.points];
            const pointsString = points2String(allPoints);

            const labelsString = Array(foreground.points.length)
                .fill(1)
                .concat(Array(background.points.length).fill(0))
                .join(",");

            const last = allPoints.length - 1;
            predictAnnotation(
                pointsString + ",0,0",
                labelsString + ",-1",
                allPoints[last]
            );
        }
    },

    onDelete() {
        const point = focus.point;
        focus.point = null;

        let idx = foreground.points.indexOf(point);
        if (idx > -1) {
            foreground.points.splice(idx, 1);
            return;
        }

        idx = background.points.indexOf(point);
        if (idx > -1) {
            background.points.splice(idx, 1);
            return;
        }
    },
};

const PredictBox = {
    _poly: null,

    activate() {
        focus.image.annotations.push(box);
        this.onFocus(focus.polygon);
    },

    deactivate() {
        const idx = focus.image.annotations.indexOf(box);
        focus.image.annotations.splice(idx, 1);

        if (this._poly) {
            this._poly.outline = false;
        }
    },

    reset() {
        box.showPoints = false;
        box.points[0].x = 0;
        box.points[0].y = 0;
        box.points[2].x = 0;
        box.points[2].y = 0;
    },

    onFocus(poly) {
        if (this._poly !== null) {
            this._poly.outline = false;
        }

        if (poly !== null) {
            poly.outline = true;
        }

        this.reset();
        this._poly = poly;
    },

    onClick(e) {
        event2canvas(e, box.points[0]);

        for (let i = 1; i < 4; i++) {
            box.points[i].x = box.points[0].x;
            box.points[i].y = box.points[0].y;
        }

        box.showPoints = true;
        box.outline = true;
        hover.point = box.points[2];
    },

    onEnter() {
        if (box.showPoints) {
            // get top-left and bottom-right corners
            const pointsString = `${Math.min(
                box.points[0].x,
                box.points[1].x
            )},${Math.min(box.points[0].y, box.points[1].y)},${Math.max(
                box.points[0].x,
                box.points[1].x
            )},${Math.max(box.points[0].y, box.points[2].y)}`;

            const spinner = {
                x: (box.points[0].x + box.points[1].x) * 0.5,
                y: (box.points[0].y + box.points[2].y) * 0.5,
            };

            predictAnnotation(pointsString, "2,3", spinner);
        }
    },

    onMove(e) {
        if (box.showPoints) {
            hoverPoints(e, box, hover);
        }
    },

    onDelete() {},
};

export let active = Edit;

export function init(_focus, _hover) {
    focus = _focus;
    hover = _hover;
}

export function editMode() {
    active.deactivate();
    Edit.activate();
    active = Edit;
}

export function pointsMode() {
    active.deactivate();
    PredictPoints.activate();
    active = PredictPoints;
}

export function boxMode() {
    active.deactivate();
    PredictBox.activate();
    active = PredictBox;
}

export function isEditMode() {
    return active === Edit;
}

const toolEditButton = document.querySelector("#tool-edit-button");
const toolPredictButton = document.querySelector("#tool-predict-button");
const predictPointsButton = document.querySelector("#subtool-points");
const predictBoxButton = document.querySelector("#subtool-box");
const predictGroup = document.querySelector("#subtools-group");

currentMode = pointsMode;

toolEditButton.addEventListener("click", () => {
    predictGroup.classList.add("hide");
    toolPredictButton.classList.remove("btn-selected");
    toolEditButton.classList.add("btn-selected");
    editMode();
    focusCanvas();
    render();
});

toolPredictButton.addEventListener("click", () => {
    predictGroup.classList.remove("hide");
    toolPredictButton.classList.add("btn-selected");
    toolEditButton.classList.remove("btn-selected");
    currentMode();
    focusCanvas();
    render();
});

predictPointsButton.addEventListener("click", () => {
    predictPointsButton.classList.add("btn-selected");
    predictBoxButton.classList.remove("btn-selected");
    currentMode = pointsMode;
    pointsMode();
    focusCanvas();
    render();
});

predictBoxButton.addEventListener("click", () => {
    predictPointsButton.classList.remove("btn-selected");
    predictBoxButton.classList.add("btn-selected");
    currentMode = boxMode;
    boxMode();
    focusCanvas();
    render();
});
