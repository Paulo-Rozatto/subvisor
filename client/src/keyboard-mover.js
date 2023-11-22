const DELAY = 20;
const VELOCITY = 20;

const speed = { x: 0, y: 0 };
let moveInterval;

let render, offset;

function init(_offset, _render) {
    render = _render;
    offset = _offset;

    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('keyup', keyupHandler);
}

function move() {
    console.log(1);
    offset.x += speed.x;
    offset.y += speed.y;
    render();
}

function keydownHandler(event) {
    switch (event.key) {
        case 'w':
            speed.y = VELOCITY;
            break;
        case 's':
            speed.y = -VELOCITY;
            break;
        case 'a':
            speed.x = VELOCITY;
            break
        case 'd':
            speed.x = -VELOCITY;
            break
    }

    if (speed.x !== 0 || speed.y !== 0) {
        clearInterval(moveInterval);
        moveInterval = setInterval(move, DELAY);
    }
}

function keyupHandler(event) {
    switch (event.key) {
        case 'w':
        case 's':
            speed.y = 0;
            break;
        case 'a':
        case 'd':
            speed.x = 0;

    }

    if (speed.x === 0 && speed.y === 0) {
        clearInterval(moveInterval);
    }
}

export const KeyboardMover = { init };
