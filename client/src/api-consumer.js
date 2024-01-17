export const SERVER_URL = "http://localhost:8080";
const API_URL = `${SERVER_URL}/api`;

export async function annotateLeaf(path, topLeft, bottomRight) {
    const points = [topLeft, bottomRight]
        .map((p) => `${parseInt(p.x)},${parseInt(p.y)}`)
        .join(",");

    const params = new URLSearchParams({ path, points });
    const response = await fetch(`${API_URL}/nn/predict?${params}`);

    if (!response.headers.get("content-type").includes("json")) {
        const text = await response.text();
        console.error(`ERRO: Resposta não está em formato JSON.`, text);
        return;
    }
    const json = await response.json();
    const pointsArray = JSON.parse(json.points) || [];
    const resultPoints = pointsArray.map((point) => ({
        x: point[0],
        y: point[1],
    }));
    return resultPoints;
}

export async function fetchDatasetList() {
    const response = await fetch(`${API_URL}/datasets/list`);
    return await response.json();
}

export async function fetchPath(path) {
    const reponse = await fetch(`${API_URL}/datasets/dir?path=${path}`);
    return await reponse.json();
}

export async function fetchImageList(path) {
    const reponse = await fetch(`${API_URL}/datasets/image-list?path=${path}`);
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
