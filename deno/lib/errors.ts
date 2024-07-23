import defaultErrorMap from "./locales/en.ts";
import type { ZodErrorMap } from "./ZodError.ts";

let overrideErrorMap = defaultErrorMap;
export { defaultErrorMap };

/**
 * @description Updates an internal error map with a new value, which is then stored
 * as the `overrideErrorMap`. This allows for customization or replacement of the
 * default error handling behavior.
 * 
 * @param {ZodErrorMap} map - Intended to set error mapping.
 */
export function setErrorMap(map: ZodErrorMap) {
  overrideErrorMap = map;
}

/**
 * @description Returns the value of a variable named `overrideErrorMap`.
 * 
 * @returns {object} Stored in a variable named `overrideErrorMap`.
 */
export function getErrorMap() {
  return overrideErrorMap;
}
