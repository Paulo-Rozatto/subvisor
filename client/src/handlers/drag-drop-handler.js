import { IMAGE_LIST, setImage } from "../app";
import { select, selected } from "./dataset-load-handler";
import { ClassesHandler } from "./classes-handler";
import { EXTENSION_REGEX } from "../utils";
import { parse } from "../parsers/folhas"; // temporary only handling folhas dataset
import { resetTimer } from "./infos-handler";

const dropZone = document.querySelector(".drop-zone");
const datasetTitle = document.querySelector("#title");
const imageList = document.querySelector(".image-list");

const supportsFileSystemAccessAPI =
    "getAsFileSystemHandle" in DataTransferItem.prototype;

function read(file, readType) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader[readType](file);
    });
}

async function loadImage(imageEntry, annotationEntry) {
    const image = IMAGE_LIST.find((img) => img.name === imageEntry.name);
    // console.log(IMAGE_LIST);
    // console.log(imageEntry.name);
    // console.log(IMAGE_LIST[0]?.name === imageEntry.name);
    // console.log(image);

    if (!image) {
        const src = await read(imageEntry, "readAsDataURL");

        let annotations;
        if (annotationEntry) {
            const annotationText = await read(annotationEntry, "readAsText");
            annotations = parse(annotationEntry.name, annotationText);
        } else {
            annotations = [];
        }

        console.log(imageEntry);
        const img = {
            name: imageEntry.name,
            folder: annotationEntry.folder,
            src,
            annotations,
            filePath: imageEntry.fullPath,
        };
        IMAGE_LIST.push(img);
        setImage(img.name, img);
        return;
    }

    setImage(image.name, image);
}

function setClasses() {
    ClassesHandler.setClasses([
        {
            name: "leaf1",
            color: "#ff5555",
            fill: true,
            stroke: false,
        },
        {
            name: "square",
            color: "#55ffff",
            fill: true,
            stroke: false,
        },
    ]);
}

async function onDrop(e) {
    e.preventDefault();
    if (!supportsFileSystemAccessAPI) {
        alert("Seu navegador não tem suporte para 'getAsFileSystemHandle'");
        return;
    }

    setClasses();

    dropZone.classList.add("hide");

    const fileHandlesPromises = [...e.dataTransfer.items]
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFileSystemHandle());

    let dirHandle = null;
    for await (const handle of fileHandlesPromises) {
        if (handle.kind === "directory" || handle.isDirectory) {
            dirHandle = handle;
            break;
        }
    }

    const images = [];
    const folders = [];

    for await (const [key, value] of dirHandle.entries()) {
        if (key.match(/\.(jpe?g|png|webp)$/i)) {
            images.push(await value.getFile());
        } else if (value.kind === "directory") {
            folders.push(value);
        }
    }

    if (images.length === 0) {
        alert("Nenhuma imagem encontrada!");
        return;
    }

    const annotations = [];
    let file;
    for (const folder of folders) {
        if (folder !== null) {
            for await (const [key, value] of folder.entries()) {
                if (key.endsWith(".xml")) {
                    file = await value.getFile();
                    file.folder = folder.name;
                    annotations.push(file);
                }
            }
        }
    }

    IMAGE_LIST.length = 0;

    const fragment = new DocumentFragment();
    for (const image of images.sort((a, b) => a.name.localeCompare(b.name))) {
        const button = document.createElement("button");
        button.classList.add("btn");
        button.tabIndex = -1;
        button.innerText = image.name.replace(EXTENSION_REGEX, "");

        const xmlName = image.name.replace(EXTENSION_REGEX, ".xml");
        const annotation = annotations.find((ann) => ann.name === xmlName);

        button.onclick = () => {
            loadImage(image, annotation);
            selected.classList.remove("selected");
            selected.classList.add("checked");
            button.classList.add("selected");
            select(button);
        };

        fragment.appendChild(button);
    }
    select(fragment.children[0]);
    selected.classList.add("selected");
    imageList.innerHTML = "";
    imageList.append(fragment);

    const xmlName = images[0].name.replace(EXTENSION_REGEX, ".xml");
    const annotation = annotations.find((ann) => ann.name === xmlName);

    datasetTitle.innerText = dirHandle.name;
    loadImage(images[0], annotation);
    resetTimer();
}

addEventListener("drop", onDrop);
addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.remove("hide");
});
dropZone.addEventListener("dragleave", () => {
    dropZone.classList.add("hide");
});
