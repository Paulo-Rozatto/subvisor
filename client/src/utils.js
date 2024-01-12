const dropZone = document.querySelector(".drop-zone");
let currentModal;

export function modalToggle(modal) {
    currentModal = modal;

    if (dropZone.classList.contains("hide")) {
        dropZone.classList.remove("hide");
        modal?.classList.remove("hide");
    } else {
        dropZone.classList.add("hide");
        modal?.classList.add("hide");
    }
}

dropZone.addEventListener("click", () => modalToggle(currentModal));

export const MOUSE = {
    get left() {
        return 1;
    },
    get right() {
        return 2;
    },
    get middle() {
        return 4;
    },
};
