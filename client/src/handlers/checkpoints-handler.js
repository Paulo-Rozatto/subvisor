import { fetchCheckpointList, loadCheckpoint } from "../api-consumer";

const checkpointsSelect = document.querySelector("#checkpoints");

async function update() {
    const list = await fetchCheckpointList();

    let options = "";

    for (const el of list) {
        options += `<option value=${el}>${el}</option>`;
    }

    checkpointsSelect.innerHTML = options;
}

function onChange() {
    const value = checkpointsSelect.value;

    console.log(value)
    if (value) {
        loadCheckpoint(value);
    }
}

checkpointsSelect.addEventListener("change", onChange);

update();
onChange();
