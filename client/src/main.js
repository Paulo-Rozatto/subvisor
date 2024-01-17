/**
 * Import other modules and keep window events in one place
 */

import "./handlers/classes-handler";
import "./handlers/dataset-load-handler";
import "./handlers/export-handler";
import "./handlers/infos-handler";

import { DragDropHandler } from "./handlers/drag-drop-handler";
import { Renderer } from "./app/renderer";
import { SettingsHandler } from "./handlers/settings-handler";
import { ThemeHandler } from "./handlers/theme-handler";
import { onKeyDown } from "./app/app";

function loadSettings() {
    ThemeHandler.load();
    SettingsHandler.load();
}

/* -- WINDOW EVENTS -- */

addEventListener("DOMContentLoaded", loadSettings);
addEventListener("drop", DragDropHandler.drop);
addEventListener("dragover", DragDropHandler.dragOver);
addEventListener("keydown", onKeyDown);
addEventListener("resize", Renderer.resetCanvas);
