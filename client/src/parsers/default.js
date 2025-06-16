import { EXTENSION_REGEX, getBoudingBox } from "../utils";
import { SERVER_URL, getXml } from "../api-consumer";
import { ClassesHandler as classes } from "../handlers/classes-handler";
import { parse as folhasParse } from "./folhas"; // todo: this is temporary i hope, parsers should not know other parsers

export const NORMALIZER = 1;

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

    for (let el of elements) {
        const points = [];

        // reconhece formato novo com bouding box sem parar de funcionar para o antigo
        const pointsTag = el.getElementsByTagName("points")[0];
        if (pointsTag) {
            el = pointsTag;
        }

        for (let i = 0; i < el.children.length; i += 2) {
            points.push({
                x: parseFloat(el.children[i].textContent) * NORMALIZER,
                y: parseFloat(el.children[i + 1].textContent) * NORMALIZER,
            });
        }

        const className = el.tagName == 'points' ? el.parentElement.tagName : el.tagName;

        annotations.push({
            class: classes.get(className),
            points,
        });
    }

    return annotations;
}

export async function fetchParse(path, imageName) {
    const src = `${SERVER_URL}/datasets${path}${imageName}`;
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
        const space3 = " ".repeat(10);

        const [x, y, width, height] = getBoudingBox(points);

        const bbox = `${space1}<bbox>
${space2}<x>${x}</x>
${space2}<y>${y}</y>
${space2}<width>${width}</width>
${space2}<height>${height}</height>
${space1}</bbox>
`;

        let coordinates = space1 + "<points>\n";

        for (let i = 0; i < points.length; i++) {
            const x = `${space2}<x${i + 1}>${points[i].x / NORMALIZER}</x${i + 1
                }>\n`;
            const y = `${space3}<y${i + 1}>${points[i].y / NORMALIZER}</y${i + 1
                }>\n`;
            coordinates += x + y;
        }
        coordinates += space1 + "</points>\n";

        arr.push(
            `    <${className}>\n${bbox + coordinates}    </${className}>`
        );
    }

    return `<annotation>
  <dir>${dirName}</dir>
  <filename>${imageName}</filename>
  <objects>
${arr.join("\n")}
  </objects>
</annotation>`.trimStart();
}
