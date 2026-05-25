// Live2D controller — owns the WebGL context and requestAnimationFrame loop.
// Combines LAppDelegate + LAppSubdelegate from the official sample into a
// single class suited for a single-canvas React component.

import { CubismFramework, Option, LogLevel } from '@framework/live2dcubismframework';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismWebGLOffscreenManager } from '@framework/rendering/cubismoffscreenmanager';

import { Live2DModel } from './Live2DModel';
import { TextureManager } from './TextureManager';
import { updateTime } from './pal';
import { MotionGroupIdle, PriorityForce } from './define';
import { InvalidMotionQueueEntryHandleValue } from '@framework/motion/cubismmotionqueuemanager';
import {
  resolveExpressionForReaction,
  type Live2DReaction,
} from '../shared/live2dReactions';
import { toLoadableModelUrl } from '../shared/live2dPaths';

export class Live2DController {
  private _canvas: HTMLCanvasElement;
  private _gl: WebGL2RenderingContext | null = null;
  private _frameBuffer: WebGLFramebuffer | null = null;
  private _textureManager: TextureManager | null = null;
  private _model: Live2DModel | null = null;
  private _rafId: number | null = null;
  private _running = false;
  private _resizeObserver: ResizeObserver | null = null;
  private _scale = 1.0;
  private _offsetX = 0;
  private _offsetY = 0;
  private _expressionIndex = -1;

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
    const loadUrl = toLoadableModelUrl(modelUrl);
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
    const lastSlash = loadUrl.lastIndexOf('/');
    const modelDir = loadUrl.slice(0, lastSlash + 1);
    const modelFile = loadUrl.slice(lastSlash + 1);

    this._model = new Live2DModel();
    await this._model.load(gl, this._textureManager, this._frameBuffer, modelDir, modelFile);

    // ── Resize observer ─────────────────────────────────────────────────────
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this._canvas);

    // ── Start render loop ───────────────────────────────────────────────────
    this.run();
  }

  setScale(scale: number): void {
    this._scale = scale;
  }

  /** Offset model from window center in CSS pixels (+x right, +y down). */
  setOffset(x: number, y: number): void {
    this._offsetX = x;
    this._offsetY = y;
  }

  /** Recompute WebGL buffer size from current canvas layout. */
  resize(): void {
    this._resizeCanvas();
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
          projection.scale(1.0 * this._scale, width / height * this._scale);
        } else {
          projection.scale(height / width * this._scale, 1.0 * this._scale);
        }

        const cssW = canvas.clientWidth || width;
        const cssH = canvas.clientHeight || height;
        if (cssW > 0 && cssH > 0 && (this._offsetX !== 0 || this._offsetY !== 0)) {
          projection.translateRelative(
            (this._offsetX / cssW) * 2,
            -(this._offsetY / cssH) * 2,
          );
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
   * Converts window-relative coords to the model's [-1,1] NDC space.
   */
  setDraggingFromEvent(clientX: number, clientY: number): void {
    const rect = this._canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this._model?.setDragging(x, y);
  }

  /**
   * Set eye-tracking target from global screen coordinates.
   * Converts global screen coords to the model's [-1,1] NDC space using window position.
   */
  setDraggingFromScreen(screenX: number, screenY: number, windowPosition: { x: number; y: number }): void {
    const rect = this._canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const canvasX = screenX - windowPosition.x;
    const canvasY = screenY - windowPosition.y;
    const x = ((canvasX - rect.left) / rect.width) * 2 - 1;
    const y = -(((canvasY - rect.top) / rect.height) * 2 - 1);
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

  getExpressionNames(): string[] {
    return this._model?.getExpressionNames() ?? [];
  }

  /** Apply a semantic reaction using expressions available on the current model. */
  applyReaction(reaction: Live2DReaction, assistantText?: string): void {
    const expr = resolveExpressionForReaction(
      reaction,
      this.getExpressionNames(),
      assistantText
    );
    if (expr) {
      this.setExpression(expr);
      return;
    }
    if (reaction === "replyError" || reaction === "userSend") {
      this.triggerRandomMotion();
    }
  }

  /** Advance to the next expression in order and log its name. */
  nextExpression(): boolean {
    if (!this._model) return false;
    const names = this._model.getExpressionNames();
    if (names.length === 0) return false;
    this._expressionIndex = (this._expressionIndex + 1) % names.length;
    const name = names[this._expressionIndex];
    this._model.setExpression(name);
    console.log(`[Live2D] Expression → "${name}" (${this._expressionIndex + 1}/${names.length})`);
    return true;
  }

  /** Trigger a random idle motion (manual trigger uses force priority). */
  triggerRandomMotion(): void {
    if (!this._model) return;
    let handle = this._model.startRandomMotion(MotionGroupIdle, PriorityForce);
    if (handle === InvalidMotionQueueEntryHandleValue) {
      handle = this._model.startRandomMotionFromAnyGroup(PriorityForce);
    }
    if (handle === InvalidMotionQueueEntryHandleValue) {
      console.log('[Live2D] No motions available');
    }
  }

  // ── private helpers ───────────────────────────────────────────────────────

  private _resizeCanvas(): void {
    if (!this._gl) return;
    const canvas = this._canvas;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;
    const dpr = window.devicePixelRatio;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    this._gl.viewport(0, 0, canvas.width, canvas.height);
  }
}
