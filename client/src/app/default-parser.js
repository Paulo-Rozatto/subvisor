import { SERVER_URL } from "../api-consumer";

const BEAN_LEAF_NORMALIZER = 4624;

async function loadXml(path, tagName) {
    const response = await fetch(path);

    if (!response.ok) {
        console.error(
            `ERROR ${response.status}: ${response.statusText}, request: ${response.url}`
        );
        return [];
    }

    const fileText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(fileText, "text/xml");
    const errorNode = xml.querySelector("parsererror");

    if (errorNode) {
        console.error(
            `ERRO: falha ao tentar passar para xml o arquivo ${fileText}`,
            errorNode
        );
        return [];
    }

    const tag = xml.getElementsByTagName(tagName)[0];
    if (!tag) {
        alert(`ERRO: ${path} não tem tag <${tagName}>`);
        return [];
    }

    const children = tag.children;
    const points = [];
    for (let i = 0; i < children.length; i += 2) {
        const point = {
            x: parseFloat(children[i].textContent) * BEAN_LEAF_NORMALIZER,
            y: parseFloat(children[i + 1].textContent) * BEAN_LEAF_NORMALIZER,
        };
        points.push(point);
    }

    return points;
}

async function parseBeanLeaf(path, imageName) {
    const src = `${SERVER_URL}/datasets/${path}/${imageName}`;
    const xmlName = imageName.replace(".jpg", ".xml");
    const leafPath = `${SERVER_URL}/datasets/${path}/leaf/${xmlName}`;
    const markerPath = `${SERVER_URL}/datasets/${path}/marker/${xmlName}`;

    const markerPoints = await loadXml(markerPath, "corners");
    const leafPoints = await loadXml(leafPath, "points");
    return {
        src,
        annotations: [
            { class: "marker", points: markerPoints },
            { class: "leaf", points: leafPoints },
        ],
        filePath: src.split("datasets")[1],
    };
}

function pointsFromEntry(entry, tagName) {
    return new Promise((resolve, reject) => {
        entry.file((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target.result;
                const parser = new DOMParser();
                const xml = parser.parseFromString(src, "text/xml");
                const tag = xml.getElementsByTagName(tagName)[0];

                if (!tag) {
                    alert(`ERRO: ${entry.name} não tem tag <${tagName}>`);
                    reject([]);
                    return;
                }

                const corners = tag.children;
                const pts = [];
                for (let i = 0; i < corners.length; i += 2) {
                    const point = {
                        x:
                            parseFloat(corners[i].textContent) *
                            BEAN_LEAF_NORMALIZER,
                        y:
                            parseFloat(corners[i + 1].textContent) *
                            BEAN_LEAF_NORMALIZER,
                    };
                    pts.push(point);
                }

                resolve(pts);
            };
            reader.readAsText(file);
        });
    });
}

export function pointsToXml(leafName, imgName, annotation) {
    const points = annotation.points;
    const tag = annotation.class === "marker" ? "corners" : "points";

    const space1 = " ".repeat(6);
    const space2 = " ".repeat(8);
    let coordinates = "";

    for (let i = 0; i < points.length; i++) {
        const x = `${space1}<x${i + 1}>${
            points[i].x / BEAN_LEAF_NORMALIZER
        }</x${i + 1}>\n`;
        const y = `${space2}<y${i + 1}>${
            points[i].y / BEAN_LEAF_NORMALIZER
        }</y${i + 1}>\n`;
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

export const DefaultParser = { parseBeanLeaf, pointsToXml, pointsFromEntry };
