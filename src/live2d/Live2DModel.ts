// Live2D model class — adapted from LAppModel in CubismWebSamples.
// Extends CubismUserModel (the official base class) and handles the full
// asset-loading chain, per-frame update, and draw call.

import { CubismDefaultParameterId } from '@framework/cubismdefaultparameterid';
import { CubismModelSettingJson } from '@framework/cubismmodelsettingjson';
import { BreathParameterData, CubismBreath } from '@framework/effect/cubismbreath';
import { LookParameterData, CubismLook } from '@framework/effect/cubismlook';
import { CubismEyeBlink } from '@framework/effect/cubismeyeblink';
import { ICubismModelSetting } from '@framework/icubismmodelsetting';
import type { CubismIdHandle } from '@framework/id/cubismid';
import { CubismFramework } from '@framework/live2dcubismframework';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismUserModel } from '@framework/model/cubismusermodel';
import {
  ACubismMotion,
  type FinishedMotionCallback,
} from '@framework/motion/acubismmotion';
import { CubismMotion } from '@framework/motion/cubismmotion';
import {
  type CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue,
} from '@framework/motion/cubismmotionqueuemanager';
import { CubismUpdateScheduler } from '@framework/motion/cubismupdatescheduler';
import { CubismBreathUpdater } from '@framework/motion/cubismbreathupdater';
import { CubismEyeBlinkUpdater } from '@framework/motion/cubismeyeblinkupdater';
import { CubismExpressionUpdater } from '@framework/motion/cubismexpressionupdater';
import { CubismLipSyncUpdater } from '@framework/motion/cubismlipsyncupdater';
import { CubismPhysicsUpdater } from '@framework/motion/cubismphysicsupdater';
import { CubismPoseUpdater } from '@framework/motion/cubismposeupdater';
import { CubismLookUpdater } from '@framework/motion/cubismlookupdater';
import { CubismRenderer_WebGL } from '@framework/rendering/cubismrenderer_webgl';
import { CubismLogError } from '@framework/utils/cubismdebug';

import { TextureManager } from './TextureManager';
import {
  MOCConsistencyValidationEnable,
  MotionConsistencyValidationEnable,
  PriorityForce,
  PriorityIdle,
  PriorityNone,
  ShaderPath,
  MotionGroupIdle,
} from './define';
import { getDeltaTime, printMessage } from './pal';

export class Live2DModel extends CubismUserModel {
  // ── internal state ─────────────────────────────────────────────────────────

  private _modelSetting: ICubismModelSetting | null = null;
  private _userTimeSeconds = 0.0;

  private _eyeBlinkIds: CubismIdHandle[] = [];
  private _lipSyncIds: CubismIdHandle[] = [];

  private _motions: Map<string, ACubismMotion> = new Map();
  private _expressions: Map<string, ACubismMotion> = new Map();

  private _look: CubismLook | null = null;
  private _updateScheduler: CubismUpdateScheduler = new CubismUpdateScheduler();
  private _motionUpdated = false;

  private _gl: WebGL2RenderingContext | null = null;
  private _frameBuffer: WebGLFramebuffer | null = null;

  private _loaded = false;
  private _released = false;

  constructor() {
    super();
  }

  get isLoaded(): boolean {
    return this._loaded;
  }

  /** True once release() has been called — load() should bail out ASAP. */
  private _aborted(signal?: AbortSignal): boolean {
    return this._released || !!signal?.aborted;
  }

  // ── public API (delegated by Live2DController) ────────────────────────────

  /** Set the eye-tracking target.  x,y should be in [-1, 1] NDC. */
  override setDragging(x: number, y: number): void {
    this._dragManager.set(x, y);
  }

  /** Start a named motion at the given priority. Returns the queue handle. */
  startMotion(
    group: string,
    no: number,
    priority: number,
    onFinished?: FinishedMotionCallback,
  ): CubismMotionQueueEntryHandle {
    if (!this._modelSetting) return InvalidMotionQueueEntryHandleValue;

    if (priority === PriorityForce) {
      this._motionManager.setReservePriority(priority);
    } else if (!this._motionManager.reserveMotion(priority)) {
      return InvalidMotionQueueEntryHandleValue;
    }

    const name = `${group}_${no}`;
    const motion = this._motions.get(name) as CubismMotion | undefined;
    if (!motion) {
      printMessage(`[Live2DModel] motion not cached: ${name}`);
      this._motionManager.setReservePriority(PriorityNone);
      return InvalidMotionQueueEntryHandleValue;
    }

    if (onFinished) motion.setFinishedMotionHandler(onFinished);
    return this._motionManager.startMotionPriority(motion, false, priority);
  }

  startRandomMotion(
    group: string,
    priority: number,
    onFinished?: FinishedMotionCallback,
  ): CubismMotionQueueEntryHandle {
    if (!this._modelSetting) return InvalidMotionQueueEntryHandleValue;
    const count = this._modelSetting.getMotionCount(group);
    if (count === 0) return InvalidMotionQueueEntryHandleValue;
    const no = Math.floor(Math.random() * count);
    return this.startMotion(group, no, priority, onFinished);
  }

  /** Pick a random motion from the first non-empty group. */
  startRandomMotionFromAnyGroup(
    priority: number,
    onFinished?: FinishedMotionCallback,
  ): CubismMotionQueueEntryHandle {
    if (!this._modelSetting) return InvalidMotionQueueEntryHandleValue;
    const groupCount = this._modelSetting.getMotionGroupCount();
    for (let g = 0; g < groupCount; g++) {
      const group = this._modelSetting.getMotionGroupName(g);
      if (this._modelSetting.getMotionCount(group) > 0) {
        return this.startRandomMotion(group, priority, onFinished);
      }
    }
    return InvalidMotionQueueEntryHandleValue;
  }

  setExpression(expressionId: string): void {
    const motion = this._expressions.get(expressionId);
    if (motion) {
      this._expressionManager.startMotion(motion, false);
    }
  }

  setRandomExpression(): void {
    if (this._expressions.size === 0) return;
    const keys = [...this._expressions.keys()];
    this.setExpression(keys[Math.floor(Math.random() * keys.length)]);
  }

  getExpressionNames(): string[] {
    return [...this._expressions.keys()];
  }

  // ── per-frame update & draw ───────────────────────────────────────────────

  update(): void {
    if (!this._loaded) return;

    const dt = getDeltaTime();
    this._userTimeSeconds += dt;

    this._model.loadParameters();

    // Motion: idle if nothing playing, otherwise update current motion.
    this._motionUpdated = false;
    if (this._motionManager.isFinished()) {
      this.startRandomMotion(MotionGroupIdle, PriorityIdle);
    } else {
      this._motionUpdated = this._motionManager.updateMotion(this._model, dt);
    }
    this._model.saveParameters();

    // Run all effect updaters (eyeBlink, breath, physics, look, etc.).
    this._updateScheduler.onLateUpdate(this._model, dt);

    // Commit WASM model update.
    this._model.update();
  }

  draw(projection: CubismMatrix44): void {
    if (!this._loaded || !this._gl) return;
    projection.multiplyByMatrix(this._modelMatrix);
    this.getRenderer().setMvpMatrix(projection);

    const gl = this._gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const viewport = [0, 0, canvas.width, canvas.height];
    const renderer = this.getRenderer() as CubismRenderer_WebGL;
    renderer.setRenderState(this._frameBuffer, viewport);
    renderer.drawModel(ShaderPath);
  }

  // ── asset loading chain ───────────────────────────────────────────────────

  /**
   * Load all model assets from `modelDir` + `modelFile` (the .model3.json).
   * Must be called once after construction and before the first update/draw.
   *
   * Pass an `AbortSignal` so a concurrent release()/model-switch can cancel
   * in-flight fetches; after every await we re-check `_released`/`signal.aborted`
   * and bail out before touching the (possibly disposed) Cubism framework.
   */
  async load(
    gl: WebGL2RenderingContext,
    textureManager: TextureManager,
    frameBuffer: WebGLFramebuffer,
    modelDir: string,
    modelFile: string,
    signal?: AbortSignal,
  ): Promise<void> {
    this._gl = gl;
    this._frameBuffer = frameBuffer;

    // ── 1. model3.json ───────────────────────────────────────────────────────
    const settingBuffer = await fetch(modelDir + modelFile, { signal }).then(r => r.arrayBuffer());
    if (this._aborted(signal)) return;
    this._modelSetting = new CubismModelSettingJson(settingBuffer, settingBuffer.byteLength);

    // ── 2. MOC3 ─────────────────────────────────────────────────────────────
    const mocFile = this._modelSetting.getModelFileName();
    if (!mocFile) throw new Error('[Live2DModel] model3.json has no model file');
    const mocBuffer = await this._fetchFile(modelDir + mocFile, signal);
    if (this._aborted(signal)) return;
    this.loadModel(mocBuffer, MOCConsistencyValidationEnable);

    // ── 3. Expressions (parallel) ────────────────────────────────────────────
    const exprCount = this._modelSetting.getExpressionCount();
    await Promise.all(
      Array.from({ length: exprCount }, (_, i) => {
        const name = this._modelSetting!.getExpressionName(i);
        const file = this._modelSetting!.getExpressionFileName(i);
        return this._fetchFile(modelDir + file, signal).then(buf => {
          if (this._aborted(signal)) return;
          const motion = this.loadExpression(buf, buf.byteLength, name);
          this._expressions.set(name, motion);
        });
      }),
    );
    if (this._aborted(signal)) return;
    if (exprCount > 0 && this._expressionManager) {
      this._updateScheduler.addUpdatableList(
        new CubismExpressionUpdater(this._expressionManager),
      );
    }

    // ── 4. Physics ───────────────────────────────────────────────────────────
    const physicsFile = this._modelSetting.getPhysicsFileName();
    if (physicsFile) {
      const buf = await this._fetchFile(modelDir + physicsFile, signal);
      if (this._aborted(signal)) return;
      this.loadPhysics(buf, buf.byteLength);
      if (this._physics) {
        this._updateScheduler.addUpdatableList(new CubismPhysicsUpdater(this._physics));
      }
    }

    // ── 5. Pose ──────────────────────────────────────────────────────────────
    const poseFile = this._modelSetting.getPoseFileName();
    if (poseFile) {
      const buf = await this._fetchFile(modelDir + poseFile, signal);
      if (this._aborted(signal)) return;
      this.loadPose(buf, buf.byteLength);
      if (this._pose) {
        this._updateScheduler.addUpdatableList(new CubismPoseUpdater(this._pose));
      }
    }

    // ── 6. Eye blink ─────────────────────────────────────────────────────────
    if (this._modelSetting.getEyeBlinkParameterCount() > 0) {
      this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
      this._updateScheduler.addUpdatableList(
        new CubismEyeBlinkUpdater(() => this._motionUpdated, this._eyeBlink),
      );
    }

    // ── 7. Breath ────────────────────────────────────────────────────────────
    this._breath = CubismBreath.create();
    const breathParams: BreathParameterData[] = [
      new BreathParameterData(
        CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamAngleX),
        0.0, 15.0, 6.5345, 0.5,
      ),
      new BreathParameterData(
        CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamAngleY),
        0.0, 8.0, 3.5345, 0.5,
      ),
      new BreathParameterData(
        CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamAngleZ),
        0.0, 10.0, 5.5345, 0.5,
      ),
      new BreathParameterData(
        CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamBodyAngleX),
        0.0, 4.0, 15.5345, 0.5,
      ),
      new BreathParameterData(
        CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamBreath),
        0.5, 0.5, 3.2345, 1.0,
      ),
    ];
    this._breath.setParameters(breathParams);
    this._updateScheduler.addUpdatableList(new CubismBreathUpdater(this._breath));

    // ── 8. UserData ──────────────────────────────────────────────────────────
    const userDataFile = this._modelSetting.getUserDataFile();
    if (userDataFile) {
      const buf = await this._fetchFile(modelDir + userDataFile, signal);
      if (this._aborted(signal)) return;
      this.loadUserData(buf, buf.byteLength);
    }

    // ── 9. Eye-blink parameter IDs ───────────────────────────────────────────
    for (let i = 0; i < this._modelSetting.getEyeBlinkParameterCount(); i++) {
      this._eyeBlinkIds.push(this._modelSetting.getEyeBlinkParameterId(i));
    }

    // ── 10. Lip-sync parameter IDs ───────────────────────────────────────────
    for (let i = 0; i < this._modelSetting.getLipSyncParameterCount(); i++) {
      this._lipSyncIds.push(this._modelSetting.getLipSyncParameterId(i));
    }
    if (this._lipSyncIds.length > 0) {
      this._updateScheduler.addUpdatableList(
        new CubismLipSyncUpdater(this._lipSyncIds, null),
      );
    }

    // ── 11. Look (head/eye drag tracking) ────────────────────────────────────
    this._look = CubismLook.create();
    const idMgr = CubismFramework.getIdManager();
    const lookParams: LookParameterData[] = [
      new LookParameterData(
        idMgr.getId(CubismDefaultParameterId.ParamAngleX), 30.0, 0.0, 0.0,
      ),
      new LookParameterData(
        idMgr.getId(CubismDefaultParameterId.ParamAngleY), 0.0, 30.0, 0.0,
      ),
      new LookParameterData(
        idMgr.getId(CubismDefaultParameterId.ParamAngleZ), 0.0, 0.0, -30.0,
      ),
      new LookParameterData(
        idMgr.getId(CubismDefaultParameterId.ParamBodyAngleX), 10.0, 0.0, 0.0,
      ),
      new LookParameterData(
        idMgr.getId(CubismDefaultParameterId.ParamEyeBallX), 1.0, 0.0, 0.0,
      ),
      new LookParameterData(
        idMgr.getId(CubismDefaultParameterId.ParamEyeBallY), 0.0, 1.0, 0.0,
      ),
    ];
    this._look.setParameters(lookParams);
    this._updateScheduler.addUpdatableList(
      new CubismLookUpdater(this._look, this._dragManager),
    );

    // Sort updaters by priority.
    this._updateScheduler.sortUpdatableList();

    // ── 12. Layout ───────────────────────────────────────────────────────────
    const layout: Map<string, number> = new Map();
    this._modelSetting.getLayoutMap(layout);
    this._modelMatrix.setupFromLayout(layout);

    // ── 13. Motions (parallel per group) ────────────────────────────────────
    this._model.saveParameters();
    const groupCount = this._modelSetting.getMotionGroupCount();
    const allMotionLoads: Promise<void>[] = [];

    for (let g = 0; g < groupCount; g++) {
      const group = this._modelSetting.getMotionGroupName(g);
      const motionCount = this._modelSetting.getMotionCount(group);
      for (let i = 0; i < motionCount; i++) {
        const motionFile = this._modelSetting.getMotionFileName(group, i);
        const name = `${group}_${i}`;
        allMotionLoads.push(
          this._fetchFile(modelDir + motionFile, signal)
            .then(buf => {
              if (this._aborted(signal)) return;
              const motion = this.loadMotion(
                buf,
                buf.byteLength,
                name,
                undefined,
                undefined,
                this._modelSetting!,
                group,
                i,
                MotionConsistencyValidationEnable,
              );
              if (motion) {
                motion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);
                this._motions.set(name, motion);
              }
            })
            .catch(err => {
              // Don't log aborts as errors — they're expected during model switch.
              if (!this._aborted(signal)) {
                CubismLogError(`Failed to load motion ${motionFile}: ${err}`);
              }
            }),
        );
      }
    }
    await Promise.all(allMotionLoads);
    if (this._aborted(signal)) return;
    this._motionManager.stopAllMotions();

    // ── 14. Renderer + shaders ───────────────────────────────────────────────
    const canvas = gl.canvas as HTMLCanvasElement;
    this.createRenderer(canvas.width, canvas.height);
    const renderer = this.getRenderer() as CubismRenderer_WebGL;
    renderer.startUp(gl);
    renderer.loadShaders(ShaderPath);

    // ── 15. Textures (parallel) ──────────────────────────────────────────────
    const textureCount = this._modelSetting.getTextureCount();
    const textureDone = new Promise<void>((resolve) => {
      let loaded = 0;
      if (textureCount === 0) { resolve(); return; }

      for (let t = 0; t < textureCount; t++) {
        const texFile = this._modelSetting!.getTextureFileName(t);
        if (!texFile) { loaded++; if (loaded >= textureCount) resolve(); continue; }

        textureManager.createTextureFromPngFile(
          modelDir + texFile,
          true, // usePremultipliedAlpha
          info => {
            // Controller released mid-load — don't touch the (possibly
            // destroyed) renderer; just unblock load() so it can bail out.
            if (this._aborted(signal)) { resolve(); return; }
            renderer.bindTexture(t, info.id);
            renderer.setIsPremultipliedAlpha(true);
            loaded++;
            if (loaded >= textureCount) resolve();
          },
        );
      }
    });
    // TextureManager uses <img> loads which an AbortSignal can't cancel, so
    // race against abort to guarantee load() resolves even when release()
    // happens during texture decoding (callbacks no-op once released).
    await Promise.race([textureDone, abortPromise(signal)]);
    if (this._aborted(signal)) return;

    this._loaded = true;
  }

  override release(): void {
    if (this._released) return;
    this._released = true;
    if (this._look) {
      CubismLook.delete(this._look);
      this._look = null;
    }
    this._updateScheduler.release();
    super.release();
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async _fetchFile(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`[Live2DModel] HTTP ${response.status} for ${url}`);
    }
    return response.arrayBuffer();
  }
}

/** A promise that resolves when `signal` aborts (never resolves if undefined). */
function abortPromise(signal?: AbortSignal): Promise<void> {
  if (!signal) return new Promise<void>(() => {});
  if (signal.aborted) return Promise.resolve();
  return new Promise<void>((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true });
  });
}
