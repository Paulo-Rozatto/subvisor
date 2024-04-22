import * as hist from "./history.js";
import * as renderer from "./renderer.js";
import * as tools from "./tools.js";
import { MOUSE, event2canvas } from "./utils.js";
import { setCurrentClass } from "./handlers/classes-handler.js";
import { setUiPolyLength } from "./handlers/infos-handler.js";

export const IMAGE_LIST = [];

export const focus = {
    _image: null,
    _polygon: null,
    _point: null,
    _multiFocus: [],

    set image(newImage) {
        this._image = newImage;
        this._polygon = null;
        this._point = null;
        this.clearMultiFocus();
    },

    get image() {
        return this._image;
    },

    set polygon(newPolygon) {
        if (this._polygon !== null) {
            this._polygon.focused = false;
            this._polygon.showPoints = false;
            this._polygon.outline = false;
        }

        if (newPolygon !== null) {
            newPolygon.focused = true;
        }

        this._polygon = newPolygon;
        this._point = null;
        this.clearMultiFocus();
        setUiPolyLength(this._polygon?.points.length || 0);
    },

    get polygon() {
        return this._polygon;
    },

    set point(newPoint) {
        if (this._point !== null) {
            this._point.focused = false;
        }

        if (newPoint !== null) {
            newPoint.focused = true;
        }

        this._point = newPoint;
        this.clearMultiFocus();
    },

    get point() {
        return this._point;
    },

    get multiFocus() {
        return this._multiFocus;
    },

    addMultiFocus(point, continuous) {
        point.focused = true;

        if (!continuous) {
            this._multiFocus.push(point);
            return;
        }
        this.clearMultiFocus();
        this._multiFocus.push(point);

        const points = this._polygon.points;
        const startIdx = points.indexOf(this._point);
        const endIdx = points.indexOf(point);
        const distance = endIdx - startIdx;
        const dir =
            Math.abs(distance) > points.length * 0.5
                ? -Math.sign(distance)
                : Math.sign(distance);

        for (let i = startIdx + dir; i !== endIdx; i += dir) {
            if (i < 0) {
                i = points.length - 1;
            } else if (i >= points.length) {
                i = 0;
            }
            points[i].focused = true;
            this._multiFocus.push(points[i]);
        }
    },

    clearMultiFocus() {
        this._multiFocus.forEach((p) => (p.focused = false));
        this._multiFocus.length = 0;
    },
};

const hover = {
    _polygon: null,
    _point: null,

    set polygon(newPolygon) {
        if (this._polygon !== null) {
            this._polygon.hovered = false;
        }

        if (newPolygon !== null) {
            newPolygon.hovered = true;
        }

        this._polygon = newPolygon;
    },
    get polygon() {
        return this._polygon;
    },

    set point(newPoint) {
        if (this._point !== null) {
            this._point.hovered = false;
        }

        if (newPoint !== null) {
            newPoint.hovered = true;
        }

        this._point = newPoint;
    },

    get point() {
        return this._point;
    },
};

tools.init(focus, hover);

let flagMoveHist = true;

// MAIN FUNCTIONS
export function setImage(name, image) {
    tools.active.deactivate();

    image.name = name;
    IMAGE_LIST.push(image);
    focus.image = image;
    hover.point = null;
    hover.polygon = null;

    tools.active.activate();

    renderer.setImage(image);
}

export function updateUiLength() {
    setUiPolyLength(focus.polygon?.points || 0);
}

function onMouseMove(e) {
    if (!focus.image) {
        return;
    }

    if (e.buttons === MOUSE.left && hover.point !== null) {
        if (flagMoveHist) {
            flagMoveHist = false;
            hist.push(focus.image, focus.polygon);
        }
        event2canvas(e, hover.point);
        renderer.render();
        return;
    }
    flagMoveHist = true;

    if (e.buttons === MOUSE.right) {
        renderer.pan(e.movementX, e.movementY);
        renderer.render();
        return;
    }

    tools.active.onMove(e);

    if (hover.point !== null) {
        renderer.render();
        return;
    }

    const l = focus.image.annotations.length;
    let annotation;

    if (
        hover.polygon !== null &&
        !renderer.ctx.isPointInPath(hover.polygon.path, e.offsetX, e.offsetY)
    ) {
        hover.polygon = null;
        renderer.canvas.style.cursor = "default";
        renderer.render();
        return;
    }

    for (let i = 0; i < l; i++) {
        annotation = focus.image.annotations[i];
        if (
            annotation !== hover.polygon &&
            annotation.path &&
            renderer.ctx.isPointInPath(annotation.path, e.offsetX, e.offsetY)
        ) {
            hover.polygon = annotation;
            renderer.canvas.style.cursor = "pointer";
        }
    }

    renderer.render();
}

function onClick(e) {
    if (e.buttons !== MOUSE.left) {
        return;
    }

    if (focus.point !== null && hover.point !== null) {
        if (e.ctrlKey) {
            focus.addMultiFocus(hover.point);
            hover.point = null;
            renderer.render();
            return;
        } else if (e.shiftKey) {
            focus.addMultiFocus(hover.point, true);
            hover.point = null;
            renderer.render();
            return;
        }
    }

    if (hover.polygon !== null && hover.polygon !== focus.polygon) {
        focus.polygon = hover.polygon;
        setCurrentClass(focus.polygon.class.name);
        tools.active.onFocus(focus.polygon);
    } else if (hover.point === null) {
        tools.active.onClick(e, focus.polygon);
    } else {
        focus.point = hover.point;
        hover.point = null;
    }
    renderer.render();
    return;
}

function onWheel(e) {
    renderer.wheelZoom(e);
    // after zooming, the points can move in or out under the cursor
    tools.active.onMove(e);
    renderer.render();
}

function onKeyDown(e) {
    const key = e.key.toLowerCase();

    if (e.ctrlKey) {
        switch (key) {
            case "z": {
                hist.undo();
                focus.point = null;
                hover.point = null;
                return;
            }

            case "y": {
                hist.redo();
                focus.point = null;
                hover.point = null;
            }
        }
    }

    switch (key) {
        case "delete":
        case "backspace": {
            if (
                focus.image !== null &&
                focus.polygon !== null &&
                focus.point !== null
            ) {
                tools.active.onDelete(focus);
                renderer.render();
            }
            break;
        }

        case "escape": {
            focus.point = null;
            focus.polygon = null;
            tools.active.reset();
            renderer.render();
            break;
        }

        case "enter": {
            tools.active.onEnter();
            break;
        }
    }
}

renderer.canvas.addEventListener("pointermove", onMouseMove);
renderer.canvas.addEventListener("wheel", onWheel);
renderer.canvas.addEventListener("pointerdown", onClick);
renderer.canvas.addEventListener("keydown", onKeyDown);
renderer.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
