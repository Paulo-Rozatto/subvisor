/**
 * Import other modules and keep window events in one place
 */

import "./handlers/classes-handler";
import "./handlers/dataset-load-handler";
import "./handlers/export-handler";
import "./handlers/infos-handler";

import { ActionHistory } from "./app/action-history";
import { DragDropHandler } from "./handlers/drag-drop-handler";
import { EditPolygon } from "./app/tools/edit-polygon";
import { PredictTool } from "./app/tools/predict-tool";
import { Renderer } from "./app/renderer";
import { SettingsHandler } from "./handlers/settings-handler";
import { ThemeHandler } from "./handlers/theme-handler";

let activeTool = null;
let activeEl = null;

function loadSettings() {
    ThemeHandler.load();
    SettingsHandler.load();
}

function activateTool(tool, el) {
    if (tool === activeTool) {
        return;
    }

    activeTool?.deactivate();
    activeTool = tool;
    tool.activate();

    el?.classList.add("btn-selected");
    activeEl?.classList.remove("btn-selected");
    activeEl = el;
}

const editPolyTool = new EditPolygon(Renderer, ActionHistory);
const predictTool = new PredictTool(Renderer);

const toolEditButton = document.querySelector("#tool-edit-button");
const toolPredictButton = document.querySelector("#tool-predict-button");

toolEditButton.addEventListener("click", () =>
    activateTool(editPolyTool, toolEditButton)
);
toolPredictButton.addEventListener("click", () =>
    activateTool(predictTool, toolPredictButton)
);

activateTool(editPolyTool, toolEditButton);

/* -- WINDOW EVENTS -- */

addEventListener("DOMContentLoaded", loadSettings);
addEventListener("drop", DragDropHandler.drop);
addEventListener("dragover", DragDropHandler.dragOver);
addEventListener("resize", Renderer.resetCanvas);
