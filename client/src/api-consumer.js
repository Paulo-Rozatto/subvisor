import {
    setSelectedPoints,
    CLASSES,
    setLeaftPoints,
    getImagePath,
    getCurrentClass
} from './app.js';

export async function boxbuttonHandler() {
    if (getCurrentClass() !== CLASSES.BOX) {
        setSelectedPoints(CLASSES.BOX);
        return;
    }

    const { imagePath, points } = getImagePath();
    const params = new URLSearchParams({ path: imagePath, points });
    const response = await fetch(
        `http://localhost:8080/api/nn/test?${params}`,
        { method: "GET", mode: "cors" }
    );
    const json = await response.json();
    const pointsArray = JSON.parse(json.points) || [];
    const resultPoints = pointsArray.map((point) => ({ x: point[0], y: point[1] }));
    setLeaftPoints(resultPoints);
}