import defaultErrorMap from "./locales/en.ts";
import type { ZodErrorMap } from "./ZodError.ts";

let overrideErrorMap = defaultErrorMap;

export { defaultErrorMap };

/**
 * @description Overrides the existing error map with a new one provided as an argument.
 * It updates the internal state by assigning the new error map to the `overrideErrorMap`
 * variable.
 *
 * @param {ZodErrorMap} map - Used to set an error map for override.
 */
export function setErrorMap(map: ZodErrorMap) {
  
  overrideErrorMap = map;
  
}

/**
 * @description Returns the value of `overrideErrorMap`. This suggests that
 * `overrideErrorMap` is a variable or an object holding error-related data, and the
 * function provides access to it.
 *
 * @returns {object} Stored in a variable named `overrideErrorMap`.
 */
export function getErrorMap() {
  return overrideErrorMap;
}
