var colors = [];

for (var r = 15; r <= 255; r += 30)
for (var g = 15; g <= 255; g += 30)
for (var b = 15; b <= 255; b += 30) colors.push([r, g, b]);

console.log(colors.length);

function sortedColors(color) {
    var unsorted = colors.slice();
    var last = color || [200, 200, 200];
    var sorted = [];

    while (sorted.length < colors.length) {
        var minDist = Infinity,
            minIndex;
        for (var i = 0; i < unsorted.length; i++) {
            var c = unsorted[i];
            var dist = distRieRGB(last[0], last[1], last[2], c[0], c[1], c[2]);
            if (dist < minDist) {
                minIndex = i;
                minDist = dist;
            }
        }
        sorted.push(unsorted[minIndex]);
        last = unsorted[minIndex];
        unsorted.splice(minIndex, 1);
    }
    return sorted;
}
