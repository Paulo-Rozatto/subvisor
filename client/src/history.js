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

export function push(image, polygon) {
    undoStack.push({
        image,
        polygon,
        copy: polygon.points.map((p) => ({ x: p.x, y: p.y })),
    });
}

export function undo() {
    const hist = undoStack.pop();
    console.log(hist);

    if (!hist) {
        return;
    }

    hist.polygon.points = hist.copy;

    const index = hist.image.annotations.findIndex(
        (ann) => ann === hist.polygon
    );
    if (index === -1) {
        hist.image.annotations.push(hist.polygon);
    }

    render();
}
