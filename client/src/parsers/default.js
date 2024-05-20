import { EXTENSION_REGEX } from "../utils";
import { SERVER_URL } from "../api-consumer";
import { ClassesHandler as classes } from "../handlers/classes-handler";

export const NORMALIZER = 4624;

export function parse(fileName, fileText) {
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

    const objects = xml.getElementsByTagName("objects")[0];
    if (!objects) {
        console.error(`ERRO:  ${fileName} não tem tag <objects>`);
        return [];
    }

    const elements = objects.children;
    const annotations = [];

    for (const el of elements) {
        const points = [];

        for (let i = 0; i < el.children.length; i += 2) {
            points.push({
                x: parseFloat(el.children[i].textContent) * NORMALIZER,
                y: parseFloat(el.children[i + 1].textContent) * NORMALIZER,
            });
        }

        annotations.push({
            class: classes.get(el.tagName),
            points,
        });
    }

    return annotations;
}

export async function fetchParse(path, imageName) {
    const src = `${SERVER_URL}/datasets/${path}/${imageName}`;
    const xmlName = imageName.replace(EXTENSION_REGEX, ".xml");
    const xmlPath = `${SERVER_URL}/datasets/${path}/annotations/${xmlName}`;
    const response = await fetch(xmlPath);

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
    };
}

export function stringify(dirName, imageName, annotations) {
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
