// Path where GLSL shaders are served from (public/shaders/).
export const ShaderPath = '/shaders/';

// Motion group names — must match model3.json keys.
export const MotionGroupIdle = 'Idle';
export const MotionGroupTapBody = 'TapBody';

// Motion priority constants.
export const PriorityNone = 0;
export const PriorityIdle = 1;
export const PriorityNormal = 2;
export const PriorityForce = 3;

// Validation flags.
export const MOCConsistencyValidationEnable = true;
export const MotionConsistencyValidationEnable = true;
