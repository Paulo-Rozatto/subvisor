import { SERVER_URL, getXml } from "../api-consumer";
import { EXTENSION_REGEX } from "../utils";
import { ClassesHandler as classes } from "../handlers/classes-handler";

setTimeout(() => {
    classes.setClasses([
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
}, 100);

export function parse(fileName, fileText) {
    // it fixes the xml problem
    fileText = fileText.replaceAll(/<(\w)(\d+)\s*\/>/gi, "</$1$2>");

    const parser = new DOMParser();
    const xml = parser.parseFromString(fileText, "text/xml");
    const errorNode = xml.querySelector("parsererror");

    if (errorNode) {
        console.error(
            `ERRO: falha ao tentar passar para xml o arquivo ${fileName}`,
            errorNode
        );
        return [];
    }

    const objects = xml.getElementsByTagName("object")[0];
    if (!objects) {
        console.error(`ERRO:  ${fileName} não tem tag <object>`);
        return [];
    }

    const elements = objects.children;
    const annotations = [];

    let elClass;
    for (const el of elements) {
        const points = [];

        for (let i = 0; i < el.children.length; i += 2) {
            points.push({
                x: parseFloat(el.children[i].textContent),
                y: parseFloat(el.children[i + 1].textContent),
            });
        }

        elClass = classes.get(el.tagName);

        if (elClass === classes.default) {
            elClass = {
                name: el.tagName,
                color: "#ff5555",
                fill: true,
                stroke: false,
            };

            classes.push(elClass);
        }

        annotations.push({
            class: elClass,
            points,
        });
    }

    return annotations;
}

export async function fetchParse(path, imageName) {
    const src = `${SERVER_URL}/datasets/${path}/${imageName}`;
    const xmlName = imageName.replace(EXTENSION_REGEX, ".xml");
    // const xmlPath = `${SERVER_URL}/datasets/${path}/annotations/${xmlName}`;
    // const response = await fetch(xmlPath);
    const response = getXml(path, xmlName);

    if (!response.ok) {
        console.error(
            `ERROR ${response.status}: ${response.statusText}, request: ${response.url}`
        );
    }

    const xmlText = await response.text();

    return {
        src,
        annotations: parse(xmlName, xmlText),
        filePath: src.split("datasets")[1],
        spinners: [],
    };
}

export function stringify(imageName, annotations) {
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
            const x = `${space1}<x${i + 1}>${Math.round(points[i].x)}</x${
                i + 1
            }>\n`;
            const y = `${space2}<y${i + 1}>${Math.round(points[i].y)}</y${
                i + 1
            }>\n`;
            coordinates += x + y;
        }

        arr.push(`    <${className}>\n${coordinates}    </${className}>`);
    }

    return `<annotation>
  <filename>${imageName}</filename>
  <object>
${arr.join("\n")}
  </object>
</annotation>`.trimStart();
}
