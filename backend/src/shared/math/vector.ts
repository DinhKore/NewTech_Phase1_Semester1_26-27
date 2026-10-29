export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] as number) * (b[i] as number);
  }
  return sum;
}

/** Returns a unit-length copy. A zero vector stays zero. */
export function normalize(values: ArrayLike<number>): Float32Array {
  const result = Float32Array.from(values);
  let norm = 0;
  for (const value of result) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm === 0) return result;
  for (let i = 0; i < result.length; i++) result[i] = (result[i] as number) / norm;
  return result;
}

export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return dot(normalize(a), normalize(b));
}

/** Serializes an embedding for a SQLite BLOB column (little-endian float32). */
export function encodeEmbedding(values: ArrayLike<number>): Uint8Array {
  const floats = Float32Array.from(values);
  return new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength);
}

export function decodeEmbedding(blob: Uint8Array): Float32Array {
  const aligned = new Uint8Array(blob); // copy => byteOffset 0, safe for Float32Array
  return new Float32Array(aligned.buffer, 0, aligned.byteLength / 4);
}
