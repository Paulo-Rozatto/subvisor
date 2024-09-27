import * as API from "../api-consumer.js";
import * as defaultParser from "../parsers/default.js";

import { EXTENSION_REGEX, modalToggle } from "../utils.js";
import { IMAGE_LIST, setImage } from "../app.js";
import { ClassesHandler } from "./classes-handler.js";
import { resetTimer } from "./infos-handler.js";

const datasetsButton = document.querySelector("#datasets-list-button");
const datasetsModal = document.querySelector("#datasets-modal");
const datasetsList = document.querySelector("#datasets-list");
const datasetsPick = document.querySelector("#datasets-pick");
const openFolder = document.querySelector("#open-folder");
const imageList = document.querySelector(".image-list");

export let openPath = "";
export let currentPath = "";
export let selected;

export const select = (el) => (selected = el);

async function loadBackendImage(path, imageName, element) {
    let image = IMAGE_LIST.find((img) => img.name === imageName);

    if (!image) {
        if (!(path || imageName)) {
            console.error(`ERRO: faltando caminho o nome da imagem`, {
                path,
                imageName,
            });
            return;
        }

        const name = imageName.replace(EXTENSION_REGEX, "");
        image = await defaultParser.fetchParse(path, imageName);

        if (!image) {
            console.error(`Can't load image ${path}`);
            return;
        }

        image = {
            ...image,
            _saved: true,
            get saved() {
                return this._saved;
            },
            set saved(value) {
                this._saved = value;
                if (element) {
                    element.innerText = value ? name : "*" + name;
                }
            },
        };

        IMAGE_LIST.push(image);
    }

    setImage(imageName, image);
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
    // eslint-disable-next-line no-use-before-define
    appendToDirList(dirs, parentPath);
}

function appendToDirList(dirs, parent) {
    const fragment = new DocumentFragment();

    if (parent) {
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
        fragment.append(element);
    });

    datasetsList.append(fragment);
}

async function showDatasets() {
    datasetsList.innerHTML = "";
    modalToggle(datasetsModal);

    if (!currentPath) {
        const dirs = (await API.fetchDatasetList()) || [];
        appendToDirList(dirs);
        return;
    }

    //todo: de-duplicate code
    const dirs = await API.fetchPath(currentPath);

    if (!dirs) {
        return;
    }

    let parentPath;
    if (currentPath !== "/") {
        parentPath =
            currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
    }
    datasetsList.innerHTML = "";
    appendToDirList(dirs, parentPath);
}

async function pickDataset() {
    const path = currentPath || "";
    const datasetInfo = await API.fetchDatasetInfo(path);

    let configs = {};
    if (datasetInfo.configString) {
        configs = JSON.parse(datasetInfo.configString);
    }
    const classes = configs.classes || [];
    const imageNames = datasetInfo.imageList;

    ClassesHandler.setClasses(classes);
    ClassesHandler.current = "";

    const dirName = path.split("/").reverse()[0];
    document.querySelector("#title").innerHTML = dirName;

    IMAGE_LIST.length = 0;

    const fragment = new DocumentFragment();
    for (const imageName of imageNames) {
        const button = document.createElement("button");
        button.classList.add("btn");
        button.tabIndex = -1;
        button.innerText = imageName.replace(".jpg", "");

        button.onclick = () => {
            loadBackendImage(path, imageName, button);
            selected.classList.remove("selected");
            selected.classList.add("checked");
            button.classList.add("selected");
            selected = button;
        };

        fragment.appendChild(button);
    }
    selected = fragment.children[0];
    selected.classList.add("selected");

    openPath = path;
    loadBackendImage(path, imageNames[0], fragment.childNodes[0]);
    modalToggle(datasetsModal);
    resetTimer();

    imageList.innerHTML = "";
    imageList.append(fragment);
}

function openLocalFolder() {
    API.requestOpenFolder(currentPath);
}

datasetsButton.addEventListener("click", showDatasets);
datasetsPick.addEventListener("click", pickDataset);
openFolder.addEventListener("click", openLocalFolder);
