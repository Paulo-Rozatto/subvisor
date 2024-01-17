import { Renderer as renderer } from "./renderer";

const MAX_STACK_SIZE = 20;

class ActionStack {
    #stack = [];

    pop() {
        return this.#stack.pop();
    }

    push(action) {
        this.#stack.push(action);
        if (this.#stack.length > MAX_STACK_SIZE) {
            this.#stack.shift();
        }
    }
}

const undoStack = new ActionStack();
const redoStack = new ActionStack();

const inverse = {
    add: "rm",
    rm: "add",
    mv: "mv",
};

// Should I really be duplicating some stuff here?
// I mean, add function here is a bit lighter than the original one at least
const actionMap = {
    add: (annotation, point, index) => {
        if (
            renderer.focused !== annotation ||
            index >= annotation.points.length
        ) {
            return false;
        }

        renderer.focused.points.splice(index, 0, point);
        renderer.render();
    },
    rm: (annotation, point) => {
        if (renderer.focused !== annotation) {
            return false;
        }

        const index = renderer.focused.points.indexOf(point);

        if (index < 0) {
            return false;
        }

        renderer.focused.points.splice(index, 1);
        renderer.render();
    },
    mv: (annotation, point, startPoint) => {
        if (renderer.focused !== annotation) {
            return;
        }

        point.x = startPoint.x;
        point.y = startPoint.y;
        renderer.render();
    },
};

function push(actionName, ...params) {
    undoStack.push({ name: inverse[actionName], args: params });
}

function undo() {
    const action = undoStack.pop();

    if (!action) {
        return;
    }

    const fn = actionMap[action.name];
    const isSucess = fn(...action.args);

    if (isSucess) {
        action.name = inverse[action.name];
        redoStack.push(action);
    }
}

export const ActionHistory = {
    push,
    undo,
};
