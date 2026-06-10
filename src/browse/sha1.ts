/** SHA-1 hex digest for SAPISIDHASH (ASCII input only). */
export function sha1Hex(message: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    const code = message.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  const words = new Uint32Array(80);
  const w = new Uint32Array(16);
  const h0 = 0x67452301;
  const h1 = 0xefcdab89;
  const h2 = 0x98badcfe;
  const h3 = 0x10325476;
  const h4 = 0xc3d2e1f0;

  let a = h0;
  let b = h1;
  let c = h2;
  let d = h3;
  let e = h4;

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  const lenBytes = new Uint8Array(8);
  const view = new DataView(lenBytes.buffer);
  view.setUint32(4, bitLen, false);
  for (let i = 0; i < 8; i++) {
    bytes.push(lenBytes[i]);
  }

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] =
        ((bytes[j] << 24) |
          (bytes[j + 1] << 16) |
          (bytes[j + 2] << 8) |
          bytes[j + 3]) >>>
        0;
    }

    for (let i = 0; i < 16; i++) {
      words[i] = w[i];
    }
    for (let i = 16; i < 80; i++) {
      words[i] = rotl(words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16], 1);
    }

    let ta = a;
    let tb = b;
    let tc = c;
    let td = d;
    let te = e;

    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (tb & tc) | (~tb & td);
        k = 0x5a827999;
      } else if (i < 40) {
        f = tb ^ tc ^ td;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (tb & tc) | (tb & td) | (tc & td);
        k = 0x8f1bbcdc;
      } else {
        f = tb ^ tc ^ td;
        k = 0xca62c1d6;
      }

      const temp = (rotl(ta, 5) + f + te + k + words[i]) >>> 0;
      te = td;
      td = tc;
      tc = rotl(tb, 30);
      tb = ta;
      ta = temp;
    }

    a = (a + ta) >>> 0;
    b = (b + tb) >>> 0;
    c = (c + tc) >>> 0;
    d = (d + td) >>> 0;
    e = (e + te) >>> 0;
  }

  return [a, b, c, d, e].map((n) => n.toString(16).padStart(8, "0")).join("");
}

function rotl(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}