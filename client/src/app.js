import * as renderer from "./renderer.js";
import * as tools from "./tools.js";
import { MOUSE, event2canvas } from "./utils.js";
import { setUiPolyLength } from "./handlers/infos-handler.js";

export const focus = {
    _image: null,
    _polygon: null,
    _point: null,

    set image(newImage) {
        this._image = newImage;
        this._polygon = null;
        this._point = null;
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
    },

    get point() {
        return this._point;
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

export const IMAGE_LIST = [];

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
        event2canvas(e, hover.point);
        renderer.render();
        return;
    }

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

    if (hover.polygon !== null && hover.polygon !== focus.polygon) {
        focus.polygon = hover.polygon;
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
    switch (e.key.toLowerCase()) {
        case "delete":
        case "backspace": {
            if (
                focus.image !== null &&
                focus.polygon !== null &&
                focus.point !== null
            ) {
                tools.active.onDelete(focus.image, focus.polygon, focus.point);
                renderer.render();
            }
            break;
        }

        case "escape": {
            focus.polygon = null;
            focus.point = null;
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
