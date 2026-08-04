/** String utilities. */
export function hashCode(value = '') {
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash) + value.charCodeAt(i) | 0;
    return Math.abs(hash);
}

String.prototype.hashCode = function () { return hashCode(this); };
