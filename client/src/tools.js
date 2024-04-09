import { annotateLeaf, saveXml } from "./api-consumer";
import { event2canvas, hoverPoints, points2String } from "./utils";
import { render, window2canvas } from "./renderer";
import { ClassesHandler as classes } from "./handlers/classes-handler";
import { DefaultParser as parser } from "./app/default-parser";

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
async function predictAnnotation(points, isBox) {
    if (focus.image === null) {
        return;
    }

    const newPoints = await annotateLeaf(focus.image.filePath, points, isBox);

    if (!newPoints) {
        return;
    }

    let ann;
    if (focus.polygon !== null) {
        ann = focus.polygon;
    } else {
        ann = {
            class: classes.default,
        };
        focus.image.annotations.push(ann);
    }
    ann.points = newPoints;
    render();

    const dirName = document.querySelector("#title").innerText;
    const path = focus.image.filePath.replace(/\/\w+\.\w+/, "");
    const xmlName = focus.image.name.replace(/(\.\w+)$/, ".xml");
    const xml = parser.annotationsToXml(
        dirName,
        focus.image.name,
        focus.image.annotations
    );

    saveXml(path, "annotations", xmlName, xml);
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
        if (poly !== null) {
            const newPoint = { x: e.offsetX, y: e.offsetY };
            window2canvas(newPoint, newPoint);
            poly.points.push(newPoint);
            focus.point = newPoint;
            hover.point = null;
        }
    },

    onMove(e) {
        hoverPoints(e, this._poly, hover);
    },

    onEnter() {},

    onDelete(image, polygon, point) {
        let idx;

        if (polygon.points.length === 3) {
            idx = image.annotations.indexOf(polygon);

            if (idx > -1) {
                image.annotations.splice(idx, 1);
            }
            return;
        }

        idx = polygon.points.indexOf(point);
        if (idx > -1) {
            polygon.points.splice(idx, 1);
        }
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
            const pointsString = points2String([
                ...foreground.points,
                ...background.points,
            ]);

            const labelsString = Array(foreground.points.length)
                .fill(1)
                .concat(Array(background.points.length).fill(0))
                .join(",");

            predictAnnotation(pointsString, labelsString, false);
        }
    },

    onDelete(_, __, point) {
        let idx = foreground.points.indexOf(point);
        if (idx > -1) {
            foreground.points.splice(idx, 1);
            return;
        }

        idx = background.points.indexOf(point);
        if (idx > -1) {
            foreground.points.splice(idx, 1);
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

    onEnter() {},

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
    render();
});

toolPredictButton.addEventListener("click", () => {
    predictGroup.classList.remove("hide");
    toolPredictButton.classList.add("btn-selected");
    toolEditButton.classList.remove("btn-selected");
    currentMode();
    render();
});

predictPointsButton.addEventListener("click", () => {
    predictPointsButton.classList.add("btn-selected");
    predictBoxButton.classList.remove("btn-selected");
    currentMode = pointsMode;
    pointsMode();
    render();
});

predictBoxButton.addEventListener("click", () => {
    predictPointsButton.classList.remove("btn-selected");
    predictBoxButton.classList.add("btn-selected");
    currentMode = boxMode;
    boxMode();
    render();
});
