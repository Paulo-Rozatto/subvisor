import { fetchCheckpointList, loadCheckpoint } from "../api-consumer";
import { focusCanvas } from "../renderer";

const checkpointsSelect = document.querySelector("#checkpoints");

async function update() {
    const { currentCheckpoint, checkpointList } = await fetchCheckpointList();

    let options = "";

    for (const el of checkpointList) {
        options += `<option value=${el}>${el}</option>`;
    }

    checkpointsSelect.innerHTML = options;
    checkpointsSelect.value = currentCheckpoint;
}

function onChange() {
    const value = checkpointsSelect.value;

    if (value) {
        loadCheckpoint(value);
    }
    focusCanvas();
}

checkpointsSelect.addEventListener("change", onChange);

update();
