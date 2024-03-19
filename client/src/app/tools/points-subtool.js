import { AbstractTool } from "./abstract-tool";
import { MOUSE } from "../../utils";
import { ClassesHandler as classes } from "../../handlers/classes-handler";

export class PointsSubTool extends AbstractTool {
    _isGrabbing = false;
    _hasMoved = false;
    _pt = { x: 0, y: 0 };

    constructor(renderer) {
        super(renderer);
    }

    deactivate() {
        this.renderer.predPoints.length = 0;
        super.deactivate();
    }

    onPointerDown(event) {
        this._buttonId = event.buttons;

        if (this._buttonId !== MOUSE.left) {
            this._hasMoved = false;
            return;
        }

        this._isGrabbing = Boolean(this.renderer.hovered);

        this.renderer.canvas2win(
            { x: event.offsetX, y: event.offsetY },
            this._pt
        );

        this.renderer.showPoints = true;
        this.renderer.render();
    }

    onPointerMove(event) {
        this._hasMoved = true;

        if (!this.renderer.hovered || !this._isGrabbing) {
            this.updateHover(event.offsetX, event.offsetY);
            return;
        }

        this.renderer.canvas2win(
            { x: event.offsetX, y: event.offsetY },
            this.renderer.hovered
        );

        this.renderer.render();
    }

    onPointerUp(event) {
        const newPoint = { x: event.offsetX, y: event.offsetY };

        if (this._buttonId !== MOUSE.left) {
            if (!this._hasMoved) {
                newPoint.isBackground = true;
            } else {
                return;
            }
        }

        if (this._isGrabbing) {
            this._isGrabbing = false;
            this.renderer.selection.set(this.renderer.hovered);
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

        this.renderer.canvas2win(newPoint, newPoint);

        this._hasMoved = false;
        this.renderer.predPoints.push(newPoint);
        this.renderer.selection.set(newPoint);
        this.renderer.render();
    }

    onKeyDown(event) {
        const key = event.key.toLowerCase();

        switch (key) {
            case "enter": {
                event.preventDefault();
                classes.predictAnnotation(this.renderer.predPoints, false);
                break;
            }

            case "escape": {
                this.renderer.predPoints = [];
                this.renderer.selection.clear();
                this.renderer.render();
                break;
            }

            case "backspace":
            case "delete": {
                let index;
                if (this.renderer.selection.length > 0) {
                    index = this.renderer.predPoints.indexOf(
                        this.renderer.hovered
                    );
                    this.renderer.selection.clear();
                } else if (this.renderer.hovered) {
                    index = this.renderer.predPoints.indexOf(
                        this.renderer.hovered
                    );
                } else {
                    return;
                }

                this.renderer.predPoints.splice(index, 1);
                this.renderer.hovered = null;
                this.renderer.render();
                break;
            }
        }
    }
}
