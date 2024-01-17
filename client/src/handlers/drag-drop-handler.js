import { IMAGE_MAP, loadImage } from "../app/app";
import { resetTimer, updateLengthInfo } from "./infos-handler";

const dropZone = document.querySelector(".drop-zone");
const datasetTitle = document.querySelector("#title");
const imageList = document.querySelector(".image-list");

let leafName;
let markerDir, leafDir;
let images = [];
let markers = [];
let leafs = [];
let selected;

function dragOver(event) {
    event.preventDefault();
    dropZone.classList.remove("hide");
}

async function setList() {
    images.sort((a, b) => a.name.localeCompare(b.name));
    markers.sort((a, b) => a.name.localeCompare(b.name));
    leafs.sort((a, b) => a.name.localeCompare(b.name));

    if (images.length !== markers.length || images.length !== leafs.length) {
        alert(
            "Quantidade de imagens, marcadores e folhas não são iguais.\n" +
                `- Imagens: ${images.length}\n- Marcadores: ${markers.length}\n- Folhas: ${leafs.length}`
        );
    }

    imageList.innerHTML = "";
    for (let i = 0; i < images.length; i++) {
        const button = document.createElement("button");
        button.classList.add("btn");
        button.tabIndex = -1;

        const imageName = images[i].name.replace(".jpg", "");
        const marker = markers.find(
            (marker) => marker.name.replace(".xml", "") === imageName
        );
        const leaf = leafs.find(
            (leaf) => leaf.name.replace(".xml", "") === imageName
        );

        button.innerText = imageName;
        button.onclick = () => {
            // saveAnnotations();
            loadImage(images[i], marker, leaf, updateLengthInfo);
            selected.classList.remove("selected");
            selected.classList.add("checked");
            button.classList.add("selected");
            selected = button;
        };
        imageList.appendChild(button);
        if (i === 0) {
            selected = button;
            button.classList.add("selected");
        }
    }
    await loadImage(images[0], markers[0], leafs[0], updateLengthInfo);
}

function drop(event) {
    event.preventDefault();
    leafName = "";
    (markerDir = null), (leafDir = null), (selected = null);
    (images = []), (markers = []), (leafs = []);
    for (const key in IMAGE_MAP) {
        delete IMAGE_MAP[key];
    }

    if (!event.dataTransfer.items) {
        console.error("No items in dataTransfer.items");
        return;
    }

    const root = [...event.dataTransfer.items][0]?.webkitGetAsEntry();
    leafName = root.name;
    if (!root.isDirectory) {
        console.error("Expected directory in dataTransfer.items, got: ", root);
        return;
    }
    datasetTitle.innerHTML = leafName;

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
        const findDir = (entries, name) =>
            entries.find((entry) => entry.isDirectory && entry.name === name);
        const filterFiles = (entries, ext) =>
            entries.filter((entry) => entry.isFile && entry.name.endsWith(ext));

        const rootReader = root.createReader();
        const rootCallback = (entries) => {
            images = filterFiles(entries, ".jpg");
            markerDir = findDir(entries, "marker");
            leafDir = findDir(entries, "leaf");
        };
        await asyncRead(rootReader, rootCallback);

        if (markerDir) {
            const markerReader = markerDir.createReader();
            const markerCallback = (entries) =>
                (markers = filterFiles(entries, ".xml"));
            await asyncRead(markerReader, markerCallback);
        }

        if (leafDir) {
            const leafReader = leafDir.createReader();
            const leafCallback = (entries) =>
                (leafs = filterFiles(entries, ".xml"));
            await asyncRead(leafReader, leafCallback);
        }

        setList();
        resetTimer();
    })();

    dropZone.classList.add("hide");
}

export const DragDropHandler = { drop, dragOver };
