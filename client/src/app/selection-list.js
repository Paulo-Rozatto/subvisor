export class SelectionList {
    #list = [];

    get length() {
        return this.#list.length;
    }

    get(index) {
        return this.#list[index];
    }

    set(value) {
        this.#list.length = 0;
        this.#list.push(value);
    }

    toggle(value) {
        const index = this.#list.indexOf(value);
        this.#list.length = 0;

        if (index === -1) {
            this.#list.push(value);
        }
    }

    clear() {
        this.#list.length = 0;
    }

    pathTo(value, options) {
        if (this.#list.length === 0) {
            this.#list.push(value);
            return;
        }

        const idx1 = options.indexOf(this.#list[0]);
        const idx2 = options.indexOf(value);

        if (idx1 === -1 || idx2 === -1) {
            return;
        }

        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);

        const distance = end - start;
        const direction = distance > options.length * 0.5 ? -1 : 1;

        this.#list.length = 0;

        for (let i = start; i !== end; i += direction) {
            if (i < 0) {
                i = options.length - 1;
            } else if (i === options.length) {
                i = 0;
            }
            this.#list.push(options[i]);
        }
        this.#list.push(options[end]);
    }

    *[Symbol.iterator]() {
        let i = 0;
        while (i < this.#list.length) {
            yield this.#list[i++];
        }
    }
}
