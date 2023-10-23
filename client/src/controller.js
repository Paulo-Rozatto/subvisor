import {
    loadImage,
    setSelectedPoints,
    CLASSES, IMAGE_MAP,
    NORMALIZER,
    getConfigs,
    setConfigs,
    getObjectLength,
    loadBackendImage,
} from './app.js';
import * as API from './api-consumer.js';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const MAX_TIME = 5999 // 100 min - 1s

// modal elements
const dropZone = document.querySelector(".drop-zone");
const configsForm = document.querySelector("#configs-form");
const configs = document.querySelector("#configs");
const info = document.querySelector("#info");
const datasetsModal = document.querySelector("#datasets-modal");
const datasetsList = document.querySelector("#datasets-list");
const datasetsPick = document.querySelector("#datasets-pick");

// side bar elements
const imageList = document.querySelector(".image-list");
const objLength = document.querySelector("#obj-length");
const timer = document.querySelector("#timer");

// left header
const markerButton = document.querySelector("#marker-button");
const leafButton = document.querySelector("#leaf-button")
const markerRadio = document.querySelector("#marker-radio");
const leafRadio = document.querySelector("#leaf-radio");
const boxButton = document.querySelector("#box-button");
const datasetsButton = document.querySelector("#datasets-list-button");
/* TODO: mover o reset button para aqui */

// right header
const themeButton = document.querySelector("#theme-button")
const configsButton = document.querySelector("#configs-button");
const infoButton = document.querySelector("#info-button")
const downloadButton = document.querySelector("#export-button");

// canvas
const canvas = document.getElementById('canvas');

let leafName;
let markerDir, leafDir;
let images = [];
let markers = [];
let leafs = [];
let selected;
let time = 0;
let interval;
let currentPath;

function toggleTheme() {
    const current = localStorage.getItem("isDarkMode") === "true";
    localStorage.setItem("isDarkMode", String(!current));
    document.querySelector("body").classList.toggle("dark-mode");
}

function setDefaultPreferences() {
    // carrega tema salvo
    const isDark = localStorage.getItem("isDarkMode") === "true";
    if (isDark) {
        document.querySelector("body").classList.add("dark-mode");
    }

    let { maxZoom, stepZoom, pointZoom, opacity } = getConfigs();
    const maxZoomStorage = localStorage.getItem("max-zoom");
    if (maxZoomStorage) {
        maxZoom = parseFloat(maxZoomStorage);
    }

    const stepZoomStorage = localStorage.getItem("step-zoom");
    if (stepZoomStorage) {
        stepZoom = parseFloat(stepZoomStorage);
    }

    const pointZoomStorage = localStorage.getItem("point-zoom");
    if (pointZoomStorage) {
        pointZoom = parseFloat(pointZoomStorage);
    }

    const opacityStorage = localStorage.getItem("opacity");
    if (opacityStorage) {
        opacity = parseFloat(opacityStorage);
    }

    setConfigs({ maxZoom, stepZoom, pointZoom, opacity });
    document.querySelector("#max-zoom").value = maxZoom;
    document.querySelector("#step-zoom").value = stepZoom;
    document.querySelector("#point-zoom").value = pointZoom;
    document.querySelector("#opacity").value = opacity;
}

function setConfigsHandler(event) {
    event.preventDefault();

    const confs = getConfigs();
    const maxZoom = document.querySelector("#max-zoom").value;
    const stepZoom = document.querySelector("#step-zoom").value;
    const pointZoom = document.querySelector("#point-zoom").value;
    const opacity = document.querySelector("#opacity").value;

    confs.maxZoom = parseFloat(maxZoom);
    confs.stepZoom = parseFloat(stepZoom);
    confs.pointZoom = parseFloat(pointZoom);
    confs.opacity = parseFloat(opacity);

    localStorage.setItem("max-zoom", maxZoom);
    localStorage.setItem("step-zoom", stepZoom);
    localStorage.setItem("point-zoom", pointZoom);
    localStorage.setItem("opacity", opacity);

    setConfigs(confs);
    configs.classList.add("hide");
    dropZone.classList.add("hide");
}

function updateLengthStats() {
    const length = getObjectLength();
    objLength.innerHTML = `${length.toString().padStart(3, "0")}`;
}

function modalToggle(modal) {
    modal.classList.toggle("hide");
    dropZone.classList.toggle("hide");
}

function updateTimer() {
    if (++time > MAX_TIME) {
        clearInterval(interval);
        return;
    }

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function setList() {
    images.sort((a, b) => a.name.localeCompare(b.name));
    markers.sort((a, b) => a.name.localeCompare(b.name));
    leafs.sort((a, b) => a.name.localeCompare(b.name));

    if (images.length !== markers.length || images.length !== leafs.length) {
        alert("Quantidade de imagens, marcadores e folhas não são iguais.\n" +
            `- Imagens: ${images.length}\n- Marcadores: ${markers.length}\n- Folhas: ${leafs.length}`);
    }

    imageList.innerHTML = "";
    for (let i = 0; i < images.length; i++) {
        const button = document.createElement("button");
        button.classList.add("btn");
        button.tabIndex = -1;

        const imageName = images[i].name.replace(".jpg", "");
        const marker = markers.find((marker) => marker.name.replace(".xml", "") === imageName);
        const leaf = leafs.find((leaf) => leaf.name.replace(".xml", "") === imageName);

        button.innerText = imageName;
        button.onclick = () => {
            loadImage(images[i], marker, leaf, updateLengthStats);
            selected.classList.remove("selected");
            selected.classList.add("checked");
            button.classList.add("selected");
            selected = button;
        };
        imageList.appendChild(button);
        if (i == 0) {
            selected = button;
            button.classList.add("selected");
        }
    }
    await loadImage(images[0], markers[0], leafs[0], updateLengthStats);
}

function dropHandler(event) {
    event.preventDefault();
    leafName = "";
    markerDir = null, leafDir = null, selected = null;
    images = [], markers = [], leafs = [];
    for (const key in IMAGE_MAP) {
        delete IMAGE_MAP[key];
    }

    if (!event.dataTransfer.items) {
        console.error("No items in dataTransfer.items")
        return;
    }

    const root = [...event.dataTransfer.items][0]?.webkitGetAsEntry();
    leafName = root.name;
    if (!root.isDirectory) {
        console.error("Expected directory in dataTransfer.items, got: ", root)
        return;
    }
    document.querySelector("#title").innerHTML = leafName;

    // o reader.readerEntries é o que retorna os arquivos e pastas dentro de um diretorio
    // ele executa assincronamente e chama as funcoes de callback onSuccess ou onError dependendo do resultado da operacao
    // readEntries pode nao retornar todos os arquivos, entao tem que chamar de novo recursivamente ate nao encontrar mais nada
    // encapsulando o readEntries dentro de uma Promise, podemos esperar o resultado da operacao usando await depois
    const asyncRead = (reader, onProgress) => {
        return new Promise((resolve, reject) => {
            const onSuccess = (entries) => {
                if (!entries || entries.length === 0) {
                    return resolve();
                }
                onProgress(entries);
                return resolve(asyncRead(reader, onProgress));
            };

            const onError = (error) => {
                console.error(error);
                return reject(error);
            };

            reader.readEntries(onSuccess, onError);
        });
    };

    // o codigo abaixo usa o asyncRead para ler os arquivos e pastas dentro do diretorio raiz
    // ele esta dentro de uma funcao auto-executavel, ou seja, a funcao executa assim que e declarada sem precisar chmar
    // isson foi feito pq o await so pode ser usado dentro de uma funcao async
    (async () => {
        const findDir = (entries, name) => entries.find((entry) => entry.isDirectory && entry.name === name);
        const filterFiles = (entries, ext) => entries.filter((entry) => entry.isFile && entry.name.endsWith(ext));

        const rootReader = root.createReader();
        const rootCallback = (entries) => {
            images = filterFiles(entries, ".jpg");
            markerDir = findDir(entries, "marker");
            leafDir = findDir(entries, "leaf");
        }
        await asyncRead(rootReader, rootCallback);

        if (!!markerDir) {
            const markerReader = markerDir.createReader();
            const markerCallback = (entries) => markers = filterFiles(entries, ".xml");
            await asyncRead(markerReader, markerCallback);
        }

        if (!!leafDir) {
            const leafReader = leafDir.createReader();
            const leafCallback = (entries) => leafs = filterFiles(entries, ".xml");
            await asyncRead(leafReader, leafCallback);
        }

        setList();
        clearInterval(interval);
        time = 0;
        interval = setInterval(updateTimer, 1000);
    })();

    dropZone.classList.add("hide");
}

function dragOverHandler(event) {
    event.preventDefault();
    dropZone.classList.remove("hide");
    dropZone.onmouseup = dragLeaveHandler;
}

function dragLeaveHandler() {
    dropZone.classList.add("hide");
    info.classList.add("hide");
    configs.classList.add("hide");
    datasetsModal.classList.add("hide");
}

async function download() {
    const zip = new JSZip();

    for (const imgName in IMAGE_MAP) {
        const markerFolder = zip.folder("marker");
        const leafFolder = zip.folder("leaf");
        const img = IMAGE_MAP[imgName];
        const markerXml = pointsToXml(img.markerPoints, imgName, "corners");
        const leafXml = pointsToXml(img.leafPoints, imgName, "points");
        markerFolder.file(imgName.replace(".jpg", ".xml"), markerXml);
        leafFolder.file(imgName.replace(".jpg", ".xml"), leafXml);
    }

    const content = await zip.generateAsync({ type: "blob" })
    saveAs(content, `${leafName}.zip`);
}

function pointsToXml(points, imgName, tag) {
    const space1 = " ".repeat(6);
    const space2 = " ".repeat(8);
    let coordinates = "";

    for (let i = 0; i < points.length; i++) {
        const x = `${space1}<x${i + 1}>${points[i].x / NORMALIZER}</x${i + 1}>\n`;
        const y = `${space2}<y${i + 1}>${points[i].y / NORMALIZER}</y${i + 1}>\n`;
        coordinates += x + y;
    }

    return `<annotation>
  <filename>${imgName}</filename>
  <object>
    <leaf> ${leafName} </leaf>
    <${tag}>
${coordinates.trimEnd()}
    </${tag}>
  </object>
</annotation>`.trimStart();
}

function appendToDirList(dirs, parent) {
    const fragment = new DocumentFragment();

    if (Boolean(parent)) {
        const element = document.createElement("li");
        element.innerText = "..";
        element.setAttribute("path", parent);
        element.onclick = enterDir;
        fragment.append(element);
    }

    dirs.forEach((dir) => {
        const element = document.createElement("li");
        element.innerText = dir;
        element.onclick = enterDir;
        fragment.append(element)
    });

    datasetsList.append(fragment);
}

async function enterDir(event) {
    const path = event.target.getAttribute("path") || event.target.innerText;
    const dirs = await API.fetchPath(path);

    if (!dirs) {
        return;
    }

    let parentPath;
    if (path !== "/") {
        // parent = path.match(/([\w-].+)\//)?.[1] || "/";
        parentPath = path.substring(0, path.lastIndexOf("/")) || "/";
    }
    datasetsList.innerHTML = "";
    currentPath = path;
    appendToDirList(dirs, parentPath);
}

async function showDatasets() {
    datasetsList.innerHTML = "";
    modalToggle(datasetsModal);

    const dirs = await API.fetchDatasetList() || [];
    appendToDirList(dirs);
}

async function pickDataset() {
    const path = currentPath || "";
    const imageNames = await API.fetchImageList(path) || [];
    // console.log(imageList);

    const fragment = new DocumentFragment();
    for (const imageName of imageNames) {
        const button = document.createElement("button");
        button.classList.add("btn");
        button.tabIndex = -1;
        button.innerText = imageName.replace(".jpg", "")

        button.onclick = () => {
            loadBackendImage(path, imageName, updateLengthStats);
            selected.classList.remove("selected");
            selected.classList.add("checked");
            button.classList.add("selected");
            selected = button;
        };

        fragment.appendChild(button);
    }
    selected = fragment.children[0];
    selected.classList.add("selected");
    imageList.innerHTML = "";
    imageList.append(fragment);

    loadBackendImage(path, imageNames[0], updateLengthStats);
    modalToggle(datasetsModal);
}

// window events
addEventListener('DOMContentLoaded', setDefaultPreferences, false);
addEventListener('dragover', dragOverHandler, false);
addEventListener('drop', dropHandler, false);
addEventListener('dragend', dragLeaveHandler, false);

// other events
dropZone.onclick = dragLeaveHandler;
configsForm.onsubmit = setConfigsHandler;
canvas.onclick = updateLengthStats;

markerButton.onclick = () => { markerRadio.checked = true; setSelectedPoints(CLASSES.MARKER); updateLengthStats(); };
leafButton.onclick = () => { leafRadio.checked = true; setSelectedPoints(CLASSES.LEAF); updateLengthStats(); };
boxButton.onclick = API.boxbuttonHandler;
datasetsButton.onclick = showDatasets;
infoButton.onclick = () => modalToggle(info)
configsButton.onclick = () => modalToggle(configs);
themeButton.onclick = toggleTheme;
downloadButton.onclick = download;
datasetsPick.onclick = pickDataset;