// Live2D controller — owns the WebGL context and requestAnimationFrame loop.
// Combines LAppDelegate + LAppSubdelegate from the official sample into a
// single class suited for a single-canvas React component.

import { CubismFramework, Option, LogLevel } from '@framework/live2dcubismframework';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismWebGLOffscreenManager } from '@framework/rendering/cubismoffscreenmanager';

import { Live2DModel } from './Live2DModel';
import { TextureManager } from './TextureManager';
import { updateTime } from './pal';

export class Live2DController {
  private _canvas: HTMLCanvasElement;
  private _gl: WebGL2RenderingContext | null = null;
  private _frameBuffer: WebGLFramebuffer | null = null;
  private _textureManager: TextureManager | null = null;
  private _model: Live2DModel | null = null;
  private _rafId: number | null = null;
  private _running = false;
  private _resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
  }

  /**
   * Initialize Cubism Framework + WebGL, load the model from the given URL
   * (e.g. "/models/Hiyori/Hiyori.model3.json"), then call run() to start
   * the render loop.
   *
   * Returns a Promise that resolves when the model is fully loaded and
   * rendering has begun.  Throws on any load failure.
   */
  async initialize(modelUrl: string): Promise<void> {
    // ── WebGL context ──────────────────────────────────────────────────────
    const gl = this._canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });
    if (!gl) throw new Error('[Live2DController] WebGL2 not supported');
    this._gl = gl;

    this._resizeCanvas();
    this._frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // ── Cubism Framework ────────────────────────────────────────────────────
    const option = new Option();
    option.logFunction = (msg: string) => console.log(msg);
    option.loggingLevel = LogLevel.LogLevel_Warning;
    CubismFramework.startUp(option);
    CubismFramework.initialize();

    // ── TextureManager + Model ──────────────────────────────────────────────
    this._textureManager = new TextureManager(gl);

    // Derive modelDir and modelFile from the URL.
    // e.g. "/models/Hiyori/Hiyori.model3.json"
    //   → dir  = "/models/Hiyori/"
    //   → file = "Hiyori.model3.json"
    const lastSlash = modelUrl.lastIndexOf('/');
    const modelDir = modelUrl.slice(0, lastSlash + 1);
    const modelFile = modelUrl.slice(lastSlash + 1);

    this._model = new Live2DModel();
    await this._model.load(gl, this._textureManager, this._frameBuffer, modelDir, modelFile);

    // ── Resize observer ─────────────────────────────────────────────────────
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this._canvas);

    // ── Start render loop ───────────────────────────────────────────────────
    this.run();
  }

  /** Start (or resume) the requestAnimationFrame render loop. */
  run(): void {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      if (!this._running) return;

      updateTime();

      const gl = this._gl!;
      const canvas = this._canvas;

      // Clear with transparent black for the translucent Tauri window.
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.clearDepth(1.0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      if (this._model?.isLoaded) {
        // Notify offscreen manager of frame start (required for mask rendering).
        CubismWebGLOffscreenManager.getInstance().beginFrameProcess(gl);

        const { width, height } = canvas;
        const projection = new CubismMatrix44();

        // Compute aspect-correct projection identical to LAppLive2DManager.
        const modelWidth = this._model.getModel()?.getCanvasWidth() ?? 1;
        if (modelWidth > 1.0 && width < height) {
          this._model.getModelMatrix().setWidth(2.0);
          projection.scale(1.0, width / height);
        } else {
          projection.scale(height / width, 1.0);
        }

        this._model.update();
        this._model.draw(projection);

        CubismWebGLOffscreenManager.getInstance().endFrameProcess(gl);
        CubismWebGLOffscreenManager.getInstance().releaseStaleRenderTextures(gl);
      }

      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  /** Stop the render loop and free all resources. */
  release(): void {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    this._model?.release();
    this._model = null;

    this._textureManager?.release();
    this._textureManager = null;

    CubismFramework.dispose();

    this._gl = null;
  }

  // ── public delegates for business layer ──────────────────────────────────

  /**
   * Set eye-tracking target from raw mouse event coordinates.
   * Converts screen coords to the model's [-1,1] NDC space.
   */
  setDraggingFromEvent(clientX: number, clientY: number): void {
    const rect = this._canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this._model?.setDragging(x, y);
  }

  startMotion(group: string, no: number, priority: number): void {
    this._model?.startMotion(group, no, priority);
  }

  startRandomMotion(group: string, priority: number): void {
    this._model?.startRandomMotion(group, priority);
  }

  setExpression(name: string): void {
    this._model?.setExpression(name);
  }

  setRandomExpression(): void {
    this._model?.setRandomExpression();
  }

  // ── private helpers ───────────────────────────────────────────────────────

  private _resizeCanvas(): void {
    if (!this._gl) return;
    const canvas = this._canvas;
    const dpr = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    this._gl.viewport(0, 0, canvas.width, canvas.height);
  }
}
