/**
 * Import other modules and keep window events in one place
 */

import "./handlers/classes-handler";
import "./handlers/dataset-load-handler";
import "./handlers/export-handler";
import "./handlers/infos-handler";

import { DragDropHandler } from "./handlers/drag-drop-handler";
import { SettingsHandler } from "./handlers/settings-handler";
import { ThemeHandler } from "./handlers/theme-handler";

/* -- DEFAULT SETTINGS -- */

function setDefault() {
    ThemeHandler.setDefault();
    SettingsHandler.setDefault();
}

/* -- WINDOW EVENTS -- */

addEventListener("DOMContentLoaded", setDefault);
addEventListener("drop", DragDropHandler.drop);
addEventListener("dragover", DragDropHandler.dragOver);
