String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.clean = function() {
    str = this.replace(/'/g, '').replace(/\s/g, '').replace(/_/g, '');
    return str;
};
