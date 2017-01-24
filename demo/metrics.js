
function distRGB(r1, g1, b1, r2, g2, b2) {
    var dr = r1 - r2,
        dg = g1 - g2,
        db = b1 - b2;
    return dr * dr + dg * dg + db * db;
}

function distCIEDE2000(r1, g1, b1, r2, g2, b2) {
    var c1 = colordiff.rgb_to_lab({R: r1, G: g1, B: b1});
    var c2 = colordiff.rgb_to_lab({R: r2, G: g2, B: b2});
    return colordiff.diff(c1, c2);
}

function distRieRGB(r1, g1, b1, r2, g2, b2) {
    var mr = (r1 + r2) / 2,
        dr = r1 - r2,
        dg = g1 - g2,
        db = b1 - b2;
    return (2 + mr / 256) * dr * dr + 4 * dg * dg + (2  + (255 - mr) / 256) * db * db;
}

function distYIQ(r1, g1, b1, r2, g2, b2) {
    var y = rgb2y(r1, g1, b1) - rgb2y(r2, g2, b2),
        i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2),
        q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);

    return y * y * 0.5053 + i * i * 0.299 + q * q * 0.1957;
}

function rgb2y(r, g, b) {
    return r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
}
function rgb2i(r, g, b) {
    return r * 0.59597799 - g * 0.27417610 - b * 0.32180189;
}
function rgb2q(r, g, b) {
    return r * 0.21147017 - g * 0.52261711 + b * 0.31114694;
}
