import { getArea, getBoudingBox } from "../utils";
import { SERVER_URL } from "../api-consumer";
import { ClassesHandler as classes } from "../handlers/classes-handler";

const NORMALIZER = 4624;

async function loadParse(path, imageName) {
    const src = `${SERVER_URL}/datasets/${path}/${imageName}`;
    const xmlName = imageName.replace(/(\.\w+)$/, ".xml");
    const xmlPath = `${SERVER_URL}/datasets/${path}/annotations/${xmlName}`;
    const response = await fetch(xmlPath);

    const parsedImage = {
        src,
        annotations: [],
        filePath: src.split("datasets")[1],
    };

    if (!response.ok) {
        console.error(
            `ERROR ${response.status}: ${response.statusText}, request: ${response.url}`
        );
        return parsedImage;
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
        return parsedImage;
    }

    const objects = xml.getElementsByTagName("objects")[0];
    if (!objects) {
        console.error(`ERRO: ${path} não tem tag <objects>`);
        return [];
    }

    const elements = objects.children;
    for (const el of elements) {
        const points = [];

        for (let i = 0; i < el.children.length; i += 2) {
            points.push({
                x: parseFloat(el.children[i].textContent) * NORMALIZER,
                y: parseFloat(el.children[i + 1].textContent) * NORMALIZER,
            });
        }

        parsedImage.annotations.push({
            class: classes.get(el.tagName),
            points,
        });
    }

    return parsedImage;
}

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
            x: parseFloat(children[i].textContent) * NORMALIZER,
            y: parseFloat(children[i + 1].textContent) * NORMALIZER,
        };
        points.push(point);
    }

    return points;
}

async function parseBeanLeaf(path, imageName) {
    const src = `${SERVER_URL}/datasets/${path}/${imageName}`;
    const xmlName = imageName.replace(/(\.\w+)$/, ".xml");
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
                        x: parseFloat(corners[i].textContent) * NORMALIZER,
                        y: parseFloat(corners[i + 1].textContent) * NORMALIZER,
                    };
                    pts.push(point);
                }

                resolve(pts);
            };
            reader.readAsText(file);
        });
    });
}

export function annotationsToXml(dirName, imageName, annotations) {
    const arr = [];

    for (const annotation of annotations) {
        const points = annotation.points;
        const className = annotation.class.name;

        if (points.length < 3 || !className) {
            continue;
        }

        const space1 = " ".repeat(6);
        const space2 = " ".repeat(8);
        let coordinates = "";

        for (let i = 0; i < points.length; i++) {
            const x = `${space1}<x${i + 1}>${points[i].x / NORMALIZER}</x${
                i + 1
            }>\n`;
            const y = `${space2}<y${i + 1}>${points[i].y / NORMALIZER}</y${
                i + 1
            }>\n`;
            coordinates += x + y;
        }

        arr.push(`    <${className}>\n${coordinates}    </${className}>`);
    }

    return `<annotation>
  <dir>${dirName}</dir>
  <filename>${imageName}</filename>
  <objects>
${arr.join("\n")}
  </objects>
</annotation>`.trimStart();
}

export function annotationsToCoco(dirName, imageList) {
    // todo: ask user to fill info
    const info = {
        year: 2024,
        version: "2024-1.0",
        description: "datset annotated with subvisor",
        contributor: "",
        url: "",
        date_created: new Date(),
    };

    const licenses = [
        {
            id: 0,
            name: "",
            url: "",
        },
    ];

    const images = [];
    const annotations = [];
    const categoriesNames = classes.list;
    const categories = categoriesNames.map((className, id) => ({
        id,
        name: className,
        supercategory: className,
    }));

    let imgId = 0;
    let annId = 0;
    for (const img of imageList) {
        const image = {
            id: imgId,
            width: img.src.width,
            height: img.src.height,
            file_name: img.name,
            license: 0, // todo: choose license
            flickr_url: "",
            coco_url: "",
            date_captured: "",
        };

        for (const ann of img.annotations) {
            const points = ann.points;
            const className = ann.class.name;

            if (points.length < 3 || !className) {
                continue;
            }

            const annotation = {
                id: annId,
                image_id: imgId,
                category_id: categoriesNames.indexOf(className),
                segmentation: [points.flatMap((pt) => [pt.x, pt.y])],
                area: getArea(points),
                bbox: getBoudingBox(points),
                iscrowd: 0,
            };

            annotations.push(annotation);
            annId += 1;
        }

        images.push(image);
        imgId += 1;
    }

    return JSON.stringify({ info, images, annotations, categories, licenses });
}

export function pointsToXml(leafName, imgName, annotation) {
    const points = annotation.points;
    const tag = annotation.class === "marker" ? "corners" : "points";

    const space1 = " ".repeat(6);
    const space2 = " ".repeat(8);
    let coordinates = "";

    for (let i = 0; i < points.length; i++) {
        const x = `${space1}<x${i + 1}>${points[i].x / NORMALIZER}</x${
            i + 1
        }>\n`;
        const y = `${space2}<y${i + 1}>${points[i].y / NORMALIZER}</y${
            i + 1
        }>\n`;
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

export const DefaultParser = {
    loadParse,
    parseBeanLeaf,
    pointsToXml,
    annotationsToXml,
    annotationsToCoco,
    pointsFromEntry,
};
