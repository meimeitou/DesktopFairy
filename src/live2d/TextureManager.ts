// WebGL texture loading — adapted from LAppTextureManager.

export interface TextureInfo {
  id: WebGLTexture;
  width: number;
  height: number;
  usePremultipliedAlpha: boolean;
  fileName: string;
}

export class TextureManager {
  private _gl: WebGL2RenderingContext;
  private _textures: Map<string, TextureInfo> = new Map();
  private _released = false;

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }

  get released(): boolean {
    return this._released;
  }

  /**
   * Load a PNG from `fileName` (URL) as a WebGL texture and call `callback`
   * once the upload is complete.  Uses premultiplied alpha when requested,
   * which is the Cubism renderer's default expectation.
   *
   * If release() is called while a texture is still loading, the in-flight
   * image's onload/onerror becomes a no-op so we never touch GL state after
   * the context has been torn down.
   */
  createTextureFromPngFile(
    fileName: string,
    usePremultipliedAlpha: boolean,
    callback: (info: TextureInfo) => void,
  ): void {
    // Already released — nothing to upload to.
    if (this._released) return;

    // Return cached texture immediately if already loaded.
    const cached = this._textures.get(fileName);
    if (cached) {
      callback(cached);
      return;
    }

    const gl = this._gl;
    const img = new Image();
    img.onload = () => {
      // Model/controller was released while the image was decoding.
      if (this._released) return;
      const texture = gl.createTexture();
      if (!texture) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (usePremultipliedAlpha) {
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D, null);

      const info: TextureInfo = {
        id: texture,
        width: img.width,
        height: img.height,
        usePremultipliedAlpha,
        fileName,
      };
      this._textures.set(fileName, info);
      callback(info);
    };
    img.onerror = () => {
      if (this._released) return;
      console.error(`[TextureManager] failed to load: ${fileName}`);
    };
    img.src = fileName;
  }

  release(): void {
    if (this._released) return;
    this._released = true;
    for (const info of this._textures.values()) {
      this._gl.deleteTexture(info.id);
    }
    this._textures.clear();
  }
}
