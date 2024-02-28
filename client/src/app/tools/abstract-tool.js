import { ClassesHandler as classes } from "../../handlers/classes-handler";
import { l1Distance } from "../../utils";

export class AbstractTool {
    constructor(renderer) {
        this.renderer = renderer;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }

    onPointerDown() {}
    onPointerMove() {}
    onPointerUp() {}
    onKeyDown() {}

    activate() {
        this.renderer.addEventListener("pointerdown", this.onPointerDown);
        this.renderer.addEventListener("pointermove", this.onPointerMove);
        this.renderer.addEventListener("pointerup", this.onPointerUp);
        this.renderer.addEventListener("keydown", this.onKeyDown);
    }

    deactivate() {
        this.renderer.focused = null;
        this.renderer.hovered = null;
        this.renderer.showRoi = false;
        classes.current = "";

        this.renderer.removeEventListener("pointerdown", this.onPointerDown);
        this.renderer.removeEventListener("pointermove", this.onPointerMove);
        this.renderer.removeEventListener("pointerup", this.onPointerUp);
        this.renderer.removeEventListener("keydown", this.onKeyDown);

        this.renderer.render();
    }

    updateHover(x, y) {
        if (!this.renderer.focused) {
            return;
        }

        const pt = { x: 0, y: 0 };
        for (const point of this.renderer.focused.points) {
            this.renderer.win2canvas(point, pt);

            if (l1Distance({ x, y }, pt) < 10) {
                this.renderer.setCursor("pointer");
                this.renderer.hovered = point;
                return;
            }
        }

        this.renderer.setCursor("default");
        this.renderer.hovered = null;
    }
}
