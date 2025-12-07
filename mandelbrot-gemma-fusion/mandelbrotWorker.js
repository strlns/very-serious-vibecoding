// let isBusy = false;
// let postponedEvent = null;
// let shouldAbort = false;
const processEvent = function (event) {
  // fixme: incoming message should abort processing of previous message, trying to add a "semaphore" inside this file failed so far
  const { width, height, xMin, xMax, yMin, yMax, maxIterations } = event.data;

  const pixels = new Uint8ClampedArray(width * height * 4);

  function getAdaptiveIterations(cx, cy) {
    let zx = 0,
      zy = 0;
    let iterations = 0;

    while (zx * zx + zy * zy < 4 && iterations < maxIterations) {
      let temp = zx * zx - zy * zy + cx;
      zy = 2 * zx * zy + cy;
      zx = temp;
      iterations++;
    }
    return iterations;
  }

  function getColorForIterations(iterations) {
    if (iterations >= maxIterations) return [0, 0, 0];
    const hue = (iterations / maxIterations) * 360;
    return hslToRgb(hue, 1, 0.5);
  }

  function hslToRgb(h, s, l) {
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return [
      Math.floor((r + m) * 255),
      Math.floor((g + m) * 255),
      Math.floor((b + m) * 255),
    ];
  }

  let index = 0;
  loop: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const re =
        parseFloat(xMin) + (x / width) * (parseFloat(xMax) - parseFloat(xMin));
      const im =
        parseFloat(yMin) + (y / height) * (parseFloat(yMax) - parseFloat(yMin));
      const iterations = getAdaptiveIterations(re, im);
      const [r, g, b] = getColorForIterations(iterations);
      pixels[index] = r;
      pixels[index + 1] = g;
      pixels[index + 2] = b;
      pixels[index + 3] = 255;
      index += 4;
    }
  }
  self.postMessage({ pixels });
};

self.onmessage = processEvent;
