import defaultErrorMap from "./locales/en.ts";
import type { ZodErrorMap } from "./ZodError.ts";

let overrideErrorMap = defaultErrorMap;

export { defaultErrorMap };

/**
 * @description Sets an error map, which is stored in the `overrideErrorMap` variable.
 * The error map is passed as a parameter and is used to override the default error
 * handling behavior for Zod schema validation errors.
 *
 * @param {ZodErrorMap} map - Used to set an error map.
 */
export function setErrorMap(map: ZodErrorMap) {
  
  overrideErrorMap = map;
  
}

/**
 * @description Returns an error map referred to by the variable `overrideErrorMap`.
 * The returned value is likely a mapping of error codes or messages to their
 * corresponding descriptions or handling logic, allowing for easy retrieval and usage
 * elsewhere in the codebase.
 *
 * @returns {object} `overrideErrorMap`.
 */
export function getErrorMap() {
  return overrideErrorMap;
}
