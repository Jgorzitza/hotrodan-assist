function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandomGenerator(seed: number = 42) {
  const random = mulberry32(seed);
  return {
    float(min = 0, max = 1) {
      return random() * (max - min) + min;
    },
    int(min: number, max: number) {
      return Math.floor(this.float(min, max + 1));
    }
  };
}
