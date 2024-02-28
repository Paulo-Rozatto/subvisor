import { AbstractTool } from "./abstract-tool";
import { MOUSE } from "../../utils";
import { ClassesHandler as classes } from "../../handlers/classes-handler";

export class PredictTool extends AbstractTool {
    _isGrabbing = false;
    _moveRoi = false;
    _p1 = null;
    _p2 = null;

    constructor(renderer) {
        super(renderer);

        const [p1, p2] = this.renderer.roi.points;
        this._p1 = p1;
        this._p2 = p2;
    }

    onPointerDown(event) {
        if (event.buttons !== MOUSE.left) {
            return;
        }

        this.renderer.focused = this.renderer.roi;

        if (this.renderer.hovered) {
            this._isGrabbing = true;
            return;
        }

        if (
            this.renderer.roi.path &&
            this.renderer.showRoi &&
            this.renderer.context.isPointInPath(
                this.renderer.roi.path,
                event.offsetX,
                event.offsetY
            )
        ) {
            this._moveRoi = true;
            return;
        }

        this.renderer.canvas2win(
            { x: event.offsetX, y: event.offsetY },
            this._p1
        );

        this._p2.x = this._p1.x;
        this._p2.y = this._p1.y;

        this._isGrabbing = true;

        this.renderer.hovered = this._p2;
        this.renderer.showRoi = true;
        this.renderer.render();
    }

    onPointerMove(event) {
        if (this._isGrabbing) {
            this.renderer.canvas2win(
                { x: event.offsetX, y: event.offsetY },
                this.renderer.hovered
            );
            return;
        }

        if (this._moveRoi) {
            const dx = event.movementX / this.renderer.zoomLevel;
            const dy = event.movementY / this.renderer.zoomLevel;

            this._p1.x += dx;
            this._p1.y += dy;
            this._p2.x += dx;
            this._p2.y += dy;

            return;
        }

        this.updateHover(event.offsetX, event.offsetY);
    }

    onPointerUp() {
        this._moveRoi = false;
        this._isGrabbing = false;
    }

    onKeyDown(event) {
        const key = event.key.toLowerCase();

        switch (key) {
            case "enter": {
                event.preventDefault();
                classes.predictAnnotation(this.renderer.roi.points);
                break;
            }
        }
    }
}
