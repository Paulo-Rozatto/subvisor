import {
    setSelectedPoints,
    CLASSES,
    setLeaftPoints,
    getImagePath,
    getCurrentClass
} from './app.js';

const API_URL = 'http://localhost:8080/api';

export async function boxbuttonHandler() {
    if (getCurrentClass() !== CLASSES.BOX) {
        setSelectedPoints(CLASSES.BOX);
        return;
    }

    const { imagePath, points } = getImagePath();
    const params = new URLSearchParams({ path: imagePath, points });
    const response = await fetch(
        `${API_URL}/nn/predict?${params}`
    );
    const json = await response.json();
    const pointsArray = JSON.parse(json.points) || [];
    const resultPoints = pointsArray.map((point) => ({ x: point[0], y: point[1] }));
    setLeaftPoints(resultPoints);
}

export async function fetchDatasetList() {
    const response = await fetch(
        `${API_URL}/datasets/list`
    );
    return await response.json();
}

export async function fetchPath(path) {
    const reponse = await fetch(
        `${API_URL}/datasets/dir?path=${path}`
    );
    return await reponse.json();
}

export async function fetchImageList(path) {
    const reponse = await fetch(
        `${API_URL}/datasets/image-list?path=${path}`
    );
    return await reponse.json();
}