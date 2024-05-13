import { render } from "./renderer";

const MAX_STACK_SIZE = 20;

class LimitedStack {
    _items = [];

    head() {
        return this._items[0];
    }

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
        polygon: polygon,
        copy: polygon?.points.map((p) => ({ x: p.x, y: p.y })) || null,
        annLength: image.annotations.length,
    });
}

export function undo(focusedImage) {
    if (undoStack.head()?.image !== focusedImage) {
        return;
    }

    const entry = undoStack.pop();

    if (!entry) {
        return;
    }

    entry.image.saved = entry.saved;

    if (entry.polygon === null) {
        const polygon = entry.image.annotations.splice(entry.annLength, 1)[0];
        entry.redoCopy = polygon;
        redoStack.push(entry);
        render();
        return;
    }

    if (!entry.redoCopy) {
        entry.redoCopy = entry.polygon.points.map((p) => ({ x: p.x, y: p.y }));
    }

    redoStack.push(entry);

    entry.polygon.points = entry.copy;

    const index = entry.image.annotations.findIndex(
        (ann) => ann === entry.polygon
    );

    if (index === -1) {
        entry.image.annotations.push(entry.polygon);
    }

    render();
}

export function redo(focusedImage) {
    if (redoStack.head()?.image !== focusedImage) {
        return;
    }

    const entry = redoStack.pop();

    if (!entry) {
        return;
    }

    entry.image.saved = !entry.saved;

    if (entry.polygon === null) {
        entry.image.annotations.splice(entry.annLength, 0, entry.redoCopy);
        undoStack.push(entry);
        render();
        return;
    }

    undoStack.push(entry);

    entry.polygon.points = entry.redoCopy;

    const index = entry.image.annotations.findIndex(
        (ann) => ann === entry.polygon
    );

    if (index === -1) {
        entry.image.annotations.push(entry.polygon);
    }

    render();
}