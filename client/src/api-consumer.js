export const SERVER_URL = "http://localhost:8080";
const API_URL = `${SERVER_URL}/api`;

export async function annotateLeaf(
    path,
    polygonString,
    pointsString,
    labelsString
) {
    const params = new URLSearchParams({
        path,
        promptMask: polygonString,
        promptPoints: pointsString,
        promptLabels: labelsString,
    });
    const response = await fetch(`${API_URL}/nn/predict?${params}`);

    if (!response.headers.get("content-type").includes("json")) {
        const text = await response.text();
        console.error(`ERRO: Resposta não está em formato JSON.`, text);
        return;
    }
    const json = await response.json();

    try {
        const pointsArray = JSON.parse(json.points) || [];
        const resultPoints = pointsArray.map((point) => ({
            x: point[0],
            y: point[1],
        }));

        return resultPoints;
    } catch {
        console.error(`ERRO: Pontos inválidos.`, json);
    }
}

export async function fetchDatasetList() {
    const response = await fetch(`${API_URL}/datasets/list`);
    return await response.json();
}

export async function fetchPath(path) {
    const reponse = await fetch(`${API_URL}/datasets/dir?path=${path}`);
    return await reponse.json();
}

export async function fetchDatasetInfo(path) {
    const reponse = await fetch(
        `${API_URL}/datasets/dataset-info?path=${path}`
    );
    return await reponse.json();
}

export async function saveXml(path, className, fileName, fileContent) {
    // todo: treat exceptions
    await fetch(`${API_URL}/datasets/save-annotation`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ path, className, fileName, fileContent }),
    });
}

export async function getXml(path, fileName) {
    return await fetch(
        `${API_URL}/datasets/annotation?path=${path}&fileName=${fileName}`
    );
}

export async function saveConfig(path, config) {
    // todo: treat exceptions
    await fetch(`${API_URL}/datasets/save-config`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ path, configString: JSON.stringify(config) }),
    });
}

export async function fetchCheckpointList() {
    const response = await fetch(`${API_URL}/nn/checkpoints`);
    return await response.json();
}

export async function loadCheckpoint(checkpoint) {
    await fetch(`${API_URL}/nn/load-checkpoint`, {
        method: "POST",
        body: checkpoint,
    });
}
