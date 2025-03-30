export default class BitChecker {
    constructor() {
        this.flags = 0;
    }

    setFlag(flag) {
        return this.flags = (this.flags | flag);
    }

    hasFlag(flag) {
        return (this.flags & flag) !== 0;
    }

    isEmpty() {
        return this.flags === 0;
    }
}