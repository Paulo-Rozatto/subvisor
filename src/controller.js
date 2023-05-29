import { loadImage, setSelectedPoints, CLASSES, IMAGE_MAP, NORMALIZER } from './app.js';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const fileList = document.querySelector("#file-list");
const dropZone = document.querySelector("#drop_zone");
const uploadButton = document.querySelector("#uploadButton");
const markerRadio = document.querySelector("#markerRadio");
const leafRadio = document.querySelector("#leafRadio");
const downloadButton = document.querySelector("#export");

dropZone.ondragover = dragOverHandler;
dropZone.ondrop = dropHandler;
uploadButton.onclick = () => {
    dropZone.classList.toggle("hide");
};
markerRadio.onclick = () => { setSelectedPoints(CLASSES.MARKER) };
leafRadio.onclick = () => { setSelectedPoints(CLASSES.LEAF) };
downloadButton.onclick = download;

let leafName;
let markerDir, leafDir;
let images = [];
let markers = [];
let leafs = [];
let selected;

function dropHandler(ev) {
    ev.preventDefault();

    if (!ev.dataTransfer.items) {
        console.error("No items in dataTransfer.items")
        return;
    }

    const root = [...ev.dataTransfer.items][0]?.webkitGetAsEntry();
    leafName = root.name;
    if (!root.isDirectory) {
        console.error("Expected directory in dataTransfer.items, got: ", root)
        return;
    }

    // readEntries pode nao retornar todos os arquivos, entao tem que chamar de novo ate nao encontrar mais nada
    const read = (reader, onProgress, onFinish) => {
        reader.readEntries(
            (entries) => {
                if (!entries || entries.length === 0) {
                    onFinish && onFinish();
                    return;
                }
                onProgress(entries);
                read(reader, onProgress, onFinish);
            },
            (error) => {
                console.error(error); reject(error)
            }
        );
    };

    // async read
    const asyncRead = (reader, onProgress) => {
        new Promise((resolve, reject) => {
            reader.readEntries(
                (entries) => {
                    if (!entries || entries.length === 0) {
                        return resolve();
                    }
                    onProgress(entries);
                    return resolve(asyncRead(reader, onProgress));
                },
                (error) => {
                    console.error(error);
                    return reject(error);
                }
            );
        });
    };


    // deve haver um jeito mais elegante de fazer isso, mas eu nao vou conseguir pensar nisso agora xD
    // o problema eh que o readEntries eh assincrono, mas nao eh uma promise, entao nao da pra usar await
    const rootReader = root.createReader();
    const response = read(
        rootReader, // reader
        (entries) => { // onProgress
            for (let entry of entries) {
                if (entry.isFile && entry.name.endsWith(".jpg")) {
                    images.push(entry);
                } else if (entry.isDirectory && entry.name === "marker") {
                    markerDir = entry;
                }
                else if (entry.isDirectory && entry.name === "leaf") {
                    leafDir = entry;
                }
            }

        },
        () => { // onFinish
            const leafReader = leafDir.createReader();
            (async () => await asyncRead(leafReader, (entries) => {
                for (let entry of entries) {
                    if (entry.isFile && entry.name.endsWith(".xml")) {
                        leafs.push(entry);
                    }
                }
            }))();

            const markerReader = markerDir.createReader();
            read(
                markerReader,
                (entries) => {
                    for (let entry of entries) {
                        if (entry.isFile && entry.name.endsWith(".xml")) {
                            markers.push(entry);
                        }
                    }
                },
                setList
            );
        }
    );

    dropZone.classList.add("hide");
}

function setList() {
    images.sort((a, b) => a.name.localeCompare(b.name));
    markers.sort((a, b) => a.name.localeCompare(b.name));
    leafs.sort((a, b) => a.name.localeCompare(b.name));

    fileList.innerHTML = "";
    for (let i = 0; i < images.length; i++) {
        const li = document.createElement("li");
        li.innerHTML = images[i].name;
        li.onclick = () => {
            loadImage(images[i], markers[i], leafs[i]);
            selected.classList.remove("select");
            selected.classList.add("checked");
            li.classList.add("select");
            selected = li;
        };
        fileList.appendChild(li);
        if (i == 0) {
            selected = li;
            li.classList.add("select");
        }
    }
    loadImage(images[0], markers[0], leafs[0]);
}

function dragOverHandler(ev) {
    ev.preventDefault();
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

    const content =  await zip.generateAsync({ type: "blob" })
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