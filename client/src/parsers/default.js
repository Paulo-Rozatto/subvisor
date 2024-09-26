import { SERVER_URL, getXml } from "../api-consumer";
import { EXTENSION_REGEX } from "../utils";
import { ClassesHandler as classes } from "../handlers/classes-handler";
import { parse as folhasParse } from "./folhas"; // todo: this is temporary i hope, parsers should not know other parsers
import { getTime } from "../handlers/infos-handler";

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
    const response = await getXml(path, xmlName);

    if (!response.ok) {
        console.error(
            `ERROR ${response.status}: ${response.statusText}, request: ${response.url}`
        );
    }

    const xmlText = await response.text();

    // todo: that should not be handled here
    const rightParse = xmlText.includes("objects") ? parse : folhasParse;

    return {
        src,
        annotations: rightParse(xmlName, xmlText),
        filePath: src.split("datasets")[1],
        spinners: [],
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
  <time>${getTime()}</time>
  <objects>
${arr.join("\n")}
  </objects>
</annotation>`.trimStart();
}
