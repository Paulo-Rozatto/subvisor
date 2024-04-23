import { render } from "./renderer";

const MAX_STACK_SIZE = 3;

class LimitedStack {
    _items = [];

    pop() {
        return this._items.pop();
    }

    push(action) {
        this._items.push(action);
        if (this._items.length > MAX_STACK_SIZE) {
            this._items.shift();
        }
    }
}

const undoStack = new LimitedStack();
const redoStack = new LimitedStack();

export function push(image, polygon) {
    undoStack.push({
        image,
        saved: image.saved,
        polygon,
        copy: polygon.points.map((p) => ({ x: p.x, y: p.y })),
    });
}

export function undo() {
    const entry = undoStack.pop();

    if (!entry) {
        return;
    }

    if (!entry.redoCopy) {
        entry.redoCopy = entry.polygon.points.map((p) => ({ x: p.x, y: p.y }));
    }

    redoStack.push(entry);

    entry.image.saved = entry.saved;
    entry.polygon.points = entry.copy;

    const index = entry.image.annotations.findIndex(
        (ann) => ann === entry.polygon
    );

    if (index === -1) {
        entry.image.annotations.push(entry.polygon);
    }

    render();
}

export function redo() {
    const entry = redoStack.pop();

    if (!entry) {
        return;
    }

    undoStack.push(entry);

    entry.image.saved = !entry.saved;
    entry.polygon.points = entry.redoCopy;

    const index = entry.image.annotations.findIndex(
        (ann) => ann === entry.polygon
    );

    if (index === -1) {
        entry.image.annotations.push(entry.polygon);
    }

    render();
}