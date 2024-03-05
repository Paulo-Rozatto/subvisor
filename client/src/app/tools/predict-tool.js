import { AbstractTool } from "./abstract-tool";
import { BoxSubtool } from "./box-subtool";
import { PointsSubTool } from "./points-subtool";

export class PredictTool extends AbstractTool {
    _pointsSubtool;
    _boxSubtool;
    _currentTool;

    constructor(renderer) {
        super(renderer);
        this._pointsSubtool = new PointsSubTool(renderer);
        this._boxSubtool = new BoxSubtool(renderer);
        this._currentTool = this._pointsSubtool;

        this.usePoints = this.usePoints.bind(this);
        this.useBox = this.useBox.bind(this);
    }

    activate() {
        this._currentTool.activate();
    }

    deactivate() {
        this._currentTool.deactivate();
    }

    _use(tool) {
        if (this._currentTool === tool) {
            return;
        }

        this._currentTool?.deactivate();
        this._currentTool = tool;
        tool.activate();
    }

    usePoints() {
        this._use(this._pointsSubtool);
    }

    useBox() {
        this._use(this._boxSubtool);
    }
}
