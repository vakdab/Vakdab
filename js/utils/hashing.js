if (!String.prototype.hashCode) {
  String.prototype.hashCode = function() {
    let h = 0;
    for (let i = 0; i < this.length; i++) { h = ((h << 5) - h) + this.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  };
}
