// import { getImageInfo, setLeaftPoints } from "./app.js";

const API_URL = "http://localhost:8080/api";

export async function annotateLeaf() {
    // const { name, path, points } = getImageInfo();
    // const params = new URLSearchParams({ path: path, points });
    // const response = await fetch(`${API_URL}/nn/predict?${params}`);
    // const json = await response.json();
    // const pointsArray = JSON.parse(json.points) || [];
    // const resultPoints = pointsArray.map((point) => ({
    //     x: point[0],
    //     y: point[1],
    // }));
    // setLeaftPoints(resultPoints, name);
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
