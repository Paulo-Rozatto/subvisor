import { MOUSE, pointToSegment, throttle } from "../../utils";
import { AbstractTool } from "./abstract-tool";
import { ClassesHandler as classes } from "../../handlers/classes-handler";

export class EditPolygon extends AbstractTool {
    _isGrabbing = false;
    _hasMoved = false;
    _buttonId = -1;
    _moveStart = { x: -1, y: -1 };
    _isCreating = false;

    constructor(renderer, hist) {
        super(renderer);
        this.hist = hist;

        this.throttleNext = throttle(this._changeSelect.bind(this), 100, 1);
        this.throttleBack = throttle(this._changeSelect.bind(this), 100, -1);
    }

    _addPoint(annotation, newPoint) {
        if (!this.renderer.focused || !this.renderer.showAnnotations) {
            return;
        }
        const limit = classes.get(annotation.class)?.points.limit;
        const points = annotation.points;

        if (limit && points.length >= limit) {
            return;
        }

        this.renderer.canvas2win(newPoint, newPoint);

        // se tem menos de 3 pontos, se pode apenas colocar o novo ponto no final
        if (points.length < 3) {
            points.push(newPoint);
            this.renderer.render();
            return;
        }

        // Senao, ache o semento mais proximo
        let distance;
        let closer = pointToSegment(
            newPoint,
            points[0],
            points[points.length - 1]
        );
        let index = points.length - 1;

        for (let i = 1; i < points.length - 1; i++) {
            distance = pointToSegment(newPoint, points[i], points[i + 1]);

            if (distance < closer) {
                closer = distance;
                index = i;
            }
        }

        points.splice(index + 1, 0, newPoint);
        this.renderer.selection.set(newPoint);
        this.hist.push("add", this.renderer.focused, newPoint, index + 1);
        this.renderer.render();
    }

    _rmPoint() {
        if (!this.renderer.focused || !this.renderer.showAnnotations) {
            return;
        }

        // remove selection
        if (this.renderer.selection.length > 0) {
            for (const point of this.renderer.selection) {
                const index = this.renderer.focused.points.indexOf(point);
                const points = this.renderer.focused.points.splice(index, 1);
                this.hist.push("rm", this.renderer.focused, points[0], index);
            }
            this.renderer.selection.clear();
            this.renderer.render();
            return;
        }

        // if there's no selection, remove hover
        if (!this.renderer.hovered) {
            return;
        }

        const index = this.renderer.focused.points.indexOf(
            this.renderer.hovered
        );
        const points = this.renderer.focused.points.splice(index, 1);
        this.renderer.hovered = null;
        this.hist.push("rm", this.renderer.focused, points[0], index);
        this.renderer.render();
    }

    _changeSelect(step) {
        if (!this.renderer.focused) {
            return;
        }
        const points = this.renderer.focused.points;
        let index = points.indexOf(this.renderer.selection.get(0)) + step;

        if (index < 0) {
            index = points.length - 1;
        } else if (index >= points.length) {
            index = 0;
        }

        this.renderer.selection.set(points[index]);
        this.renderer.centerSelection();
    }

    onPointerDown(event) {
        this._buttonId = event.buttons;
        if (this._buttonId !== MOUSE.left || !this.renderer.showAnnotations) {
            return;
        }

        this._isGrabbing = Boolean(this.renderer.hovered);

        if (this._isGrabbing) {
            this._moveStart.x = this.renderer.hovered.x;
            this._moveStart.y = this.renderer.hovered.y;
        }
    }

    onPointerMove(event) {
        if (
            !this.renderer.showAnnotations ||
            !this.renderer.hovered ||
            !this._isGrabbing
        ) {
            this.updateHover(event.offsetX, event.offsetY);
            return;
        }

        this.renderer.canvas2win(
            { x: event.offsetX, y: event.offsetY },
            this.renderer.hovered
        );
        this._hasMoved = true;

        this.renderer.render();
    }

    onPointerUp(event) {
        if (this._isGrabbing) {
            this._isGrabbing = false;

            if (this._hasMoved) {
                this.hist.push(
                    "mv",
                    this.renderer.focused,
                    this.renderer.hovered,
                    {
                        ...this._moveStart,
                    }
                );
                this.renderer.selection.set(this.renderer.hovered);
                return;
            }

            if (event.shiftKey) {
                this.renderer.selection.pathTo(
                    this.renderer.hovered,
                    this.renderer.focused.points
                );
                this.renderer.render();
                return;
            }

            if (event.ctrlKey) {
                this.renderer.selection.push(this.renderer.hovered);
                this.renderer.render();
                return;
            }

            this.renderer.selection.toggle(this.renderer.hovered);
            this.renderer.render();
            return;
        }

        if (this._buttonId !== MOUSE.left) {
            return;
        }

        if (this.renderer.annotations) {
            for (const annotation of this.renderer.annotations) {
                if (
                    annotation.path &&
                    this.renderer.focused !== annotation &&
                    this.renderer.context.isPointInPath(
                        annotation.path,
                        event.offsetX,
                        event.offsetY
                    )
                ) {
                    this.renderer.selection.clear();
                    this.renderer.focused = annotation;
                    this.renderer.render();
                    classes.current = annotation.class;
                    return;
                }
            }
        }
        if (!this.renderer.focused) {
            const newAnnotation = {
                class: classes.last || "default",
                points: [],
            };

            this._isCreating = true;
            this.renderer.annotations.push(newAnnotation);
            this.renderer.focused = newAnnotation;
            classes.current = newAnnotation.class;
        }

        const newPoint = { x: event.offsetX, y: event.offsetY };
        this._addPoint(this.renderer.focused, newPoint);
    }

    onKeyDown(event) {
        const key = event.key.toLowerCase();

        switch (key) {
            case "escape": {
                this._isCreating = false;
                break;
            }

            case "enter": {
                this._isCreating = false;
                break;
            }

            case "backspace":
            case "delete": {
                this._rmPoint();
                break;
            }

            case "arrowleft": {
                const pt = this.renderer.focused.points.pop();
                this.renderer.focused.points.unshift(pt);
                this.renderer.render();
                break;
            }

            case "arrowright": {
                const pt = this.renderer.focused.points.shift();
                this.renderer.focused.points.push(pt);
                this.renderer.render();
                break;
            }

            case "v": {
                this.throttleNext();
                break;
            }

            case "x": {
                this.throttleBack();
                break;
            }

            case "t": {
                if (
                    !(
                        this.renderer.focused &&
                        this.renderer.selection.length === 2
                    )
                ) {
                    break;
                }

                const first = this.renderer.selection.get(0);
                const second = this.renderer.selection.get(1);

                const firstIndex = this.renderer.focused.points.indexOf(first);
                const secondIndex =
                    this.renderer.focused.points.indexOf(second);

                this.renderer.focused.points[firstIndex] = second;
                this.renderer.focused.points[secondIndex] = first;

                this.renderer.render();

                break;
            }
        }
    }
}
