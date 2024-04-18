import { getArea, getBoudingBox } from "../utils";
import { ClassesHandler as classes } from "../handlers/classes-handler";

// todo: implement function fetchParse()

export function stringify(imageList) {
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
