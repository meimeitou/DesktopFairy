// UTF-8 boundary fixup. PTY/SSH streams may split a multi-byte character
// across data events; decoding each chunk independently produces U+FFFD
// (�) for CJK/emoji. Hold incomplete trailing bytes until the next chunk.
function createUtf8BoundaryMiddleware() {
  let pending = Buffer.alloc(0);
  return (chunk) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const combined = pending.length ? Buffer.concat([pending, buf]) : buf;
    let cutAt = combined.length;
    // Walk back over trailing continuation bytes (10xxxxxx) to the leading
    // byte. If that sequence is incomplete, keep it in `pending`; if it is
    // complete, the whole buffer is ready (cutAt stays at combined.length).
    while (cutAt > 0) {
      const byte = combined[cutAt - 1];
      if (byte < 0x80) break; // ASCII, complete
      if (byte >= 0xC0) { // leading byte
        const need = byte >= 0xF0 ? 4 : byte >= 0xE0 ? 3 : 2;
        const have = combined.length - (cutAt - 1);
        if (have < need) {
          cutAt -= 1; // incomplete sequence starts at this leading byte
        } else {
          cutAt = combined.length; // trailing sequence is complete
        }
        break;
      }
      cutAt -= 1; // continuation byte, keep scanning
    }
    const complete = combined.subarray(0, cutAt);
    pending = combined.subarray(cutAt);
    return complete;
  };
}

function toBuffer(data) {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

module.exports = { createUtf8BoundaryMiddleware, toBuffer };
