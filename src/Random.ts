export class Random {
  constructor(public readonly seed: number)
  {}

  public readonly Next = () => (
    getRandom(this.seed)
  );
}

/**

seedrandom.js
=============

Seeded random number generator for Javascript.

version 2.3.10
Author: David Bau
Date: 2014 Sep 20

LICENSE (MIT)
-------------

Copyright 2014 David Bau.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

//
// The following constants are related to IEEE 754 limits.
//

const pool = [];   // pool: entropy pool starts empty
const WIDTH = 256; // width: each RC4 output is 0 <= x < 256
const CHUNKS = 6;  // chunks: at least six RC4 outputs for each double
const digits = 52; // digits: there are 52 significant digits in a double

const startdenom = Math.pow(WIDTH, CHUNKS);
const significance = Math.pow(2, digits);
const overflow = significance * 2;
const mask = WIDTH - 1;

function getRandom(seed: number): number {
  const key = [];

  // Flatten the seed string or build one from local entropy if needed.
  mixkey(flatten(seed, 3), key);

  // Use the seed to initialize an ARC4 generator.
  const arc4 = new ARC4(key);

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // This returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.
  let n = arc4.g(CHUNKS);             // Start with a numerator n < 2 ^ 48
  let d = startdenom;                 //   and denominator d = 2 ^ 48.
  let x = 0;                          //   and no 'extra last byte'.

  while (n < significance) {          // Fill up all significant digits by
    n = (n + x) * WIDTH;              //   shifting numerator and
    d *= WIDTH;                       //   denominator and generating a
    x = arc4.g(1);                    //   new least-significant-byte.
  }

  while (n >= overflow) {             // To avoid rounding up, before adding
    n /= 2;                           //   last byte, shift everything
    d /= 2;                           //   right using integer math until
    x >>>= 1;                         //   we have exactly the desired bits.
  }

  return (n + x) / d;                 // Form the number within [0, 1).
};

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
/** @constructor */
class ARC4 {
  public i: any;
  public j: any;
  public S: any;

  constructor(key: any[]) {
    let t: any;
    let keylen = key.length;
    this.i = 0;
    this.j = 0;
    this.S = [];

    // The empty key [] is treated as [0].
    if (!keylen) {
      key = [ keylen++ ];
    }

    // Set up S using the standard key scheduling algorithm.
    while (this.i < WIDTH) {
      this.S[this.i] = this.i += 1;
    }

    for (this.i = 0; this.i < WIDTH; this.i += 1) {
      this.S[this.i] = this.S[this.j = mask & (this.j + key[this.i % keylen] + (t = this.S[this.i]))];
      this.S[this.j] = t;
    }
  }

  // The "g" method returns the next (count) outputs as one number.
  public readonly g = (width: number) => {
    // Using instance members instead of closure state nearly doubles speed.
    let t: any;
    let r = 0;
    let count = width;
    while (count--) {
      t = this.S[this.i = mask & (this.i + 1)];
      r = r * WIDTH + this.S[mask & ((this.S[this.i] = this.S[this.j = mask & (this.j + t)]) + (this.S[this.j] = t))];
    }

    this.i = this.i;
    this.j = this.j;

    return r;
  };
}

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj: any, depth: number) {
  const result = []
  let prop: any;

  if (depth && typeof obj === 'object') {
    for (prop in obj) {
      try {
        result.push(flatten(obj[prop], depth - 1));
      } catch (e) {}
    }
  }

  if (result.length) {
    return result;
  } else if (typeof obj === 'string') {
    return obj;
  }

  return `${obj}\0`;
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed: any, key: any) {
  const stringseed = seed + '';
  let smear: any;
  let j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }

  return tostring(key);
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a: any) {
  return String.fromCharCode.apply(0, a);
}
