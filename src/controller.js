import { loadImage, setSelectedPoints, CLASSES, IMAGE_MAP, NORMALIZER } from './app.js';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const sideBar = document.querySelector("aside");
const dropZone = document.querySelector(".drop-zone");
const markerButton = document.querySelector("#marker-button");
const leafButton = document.querySelector("#leaf-button")
const markerRadio = document.querySelector("#marker-radio");
const leafRadio = document.querySelector("#leaf-radio");
const downloadButton = document.querySelector("#export-button");
const infoButton = document.querySelector("#info-button")
const info = document.querySelector(".info")
const themeButton = document.querySelector("#theme-button")

window.ondragover = dragOverHandler;
window.ondrop = dropHandler;
window.ondragend = dragLeaveHandler;
window.onload = checkIsDarkTheme;
dropZone.onclick = dragLeaveHandler;

markerButton.onclick = () => { markerRadio.checked = true; setSelectedPoints(CLASSES.MARKER) };
leafButton.onclick = () => { leafRadio.checked = true; setSelectedPoints(CLASSES.LEAF) };
infoButton.onclick = () => { info.classList.toggle("hide"); dropZone.classList.toggle("hide") }
themeButton.onclick = toggleTheme;
downloadButton.onclick = download;

let leafName;
let markerDir, leafDir;
let images = [];
let markers = [];
let leafs = [];
let selected;

function toggleTheme() {
    const current = localStorage.getItem("isDarkMode") === "true";
    localStorage.setItem("isDarkMode", String(!current));
    document.querySelector("body").classList.toggle("dark-mode");
}

function checkIsDarkTheme() {
    const isDark = localStorage.getItem("isDarkMode") === "true";
    if (isDark) {
        document.querySelector("body").classList.add("dark-mode");
    }
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

        const markerReader = markerDir.createReader();
        const markerCallback = (entries) => markers = filterFiles(entries, ".xml");
        await asyncRead(markerReader, markerCallback);

        const leafReader = leafDir.createReader();
        const leafCallback = (entries) => leafs = filterFiles(entries, ".xml");
        await asyncRead(leafReader, leafCallback);

        setList();
    })();

    dropZone.classList.add("hide");
}

function setList() {
    images.sort((a, b) => a.name.localeCompare(b.name));
    markers.sort((a, b) => a.name.localeCompare(b.name));
    leafs.sort((a, b) => a.name.localeCompare(b.name));

    if (images.length !== markers.length || images.length !== leafs.length) {
        alert("Quantidade de imagens, marcadores e folhas não são iguais.\n" +
            `- Imagens: ${images.length}\n- Marcadores: ${markers.length}\n- Folhas: ${leafs.length}`);
    }

    sideBar.innerHTML = "";
    for (let i = 0; i < images.length; i++) {
        const button = document.createElement("button");
        button.classList.add("btn");
        button.tabIndex = -1;

        const imageName = images[i].name.replace(".jpg", "");
        const marker = markers.find((marker) => marker.name.replace(".xml", "") === imageName);
        const leaf = leafs.find((leaf) => leaf.name.replace(".xml", "") === imageName);

        button.innerText = imageName;
        button.onclick = () => {
            loadImage(images[i], marker, leaf);
            selected.classList.remove("selected");
            selected.classList.add("checked");
            button.classList.add("selected");
            selected = button;
        };
        sideBar.appendChild(button);
        if (i == 0) {
            selected = button;
            button.classList.add("selected");
        }
    }
    loadImage(images[0], markers[0], leafs[0]);
}

function dragOverHandler(event) {
    event.preventDefault();
    dropZone.classList.remove("hide");
    window.onmouseup = dragLeaveHandler;
}

function dragLeaveHandler() {
    dropZone.classList.add("hide");
    info.classList.add("hide");
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
