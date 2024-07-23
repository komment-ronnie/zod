import { getErrorMap } from "../errors.ts";
import defaultErrorMap from "../locales/en.ts";
import type { IssueData, ZodErrorMap, ZodIssue } from "../ZodError.ts";
import type { ZodParsedType } from "./util.ts";

/**
 * @description Takes parameters to create a Zod issue object, which represents an
 * error or validation failure. It combines input data with a path and error maps to
 * generate a detailed error message.
 * 
 * @param {{
 *   data: any;
 *   path: (string | number)[];
 *   errorMaps: ZodErrorMap[];
 *   issueData: IssueData;
 * }} params - Used to create an issue object.
 * 
 * @returns {ZodIssue} An object with three properties: `path`, `message`, and possibly
 * others depending on the input data.
 */
export const makeIssue = (params: {
  data: any;
  path: (string | number)[];
  errorMaps: ZodErrorMap[];
  issueData: IssueData;
}): ZodIssue => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...(issueData.path || [])];
  const fullIssue = {
    ...issueData,
    path: fullPath,
  };

  if (issueData.message !== undefined) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message,
    };
  }

  let errorMessage = "";
  const maps = errorMaps
    .filter((m) => !!m)
    .slice()
    .reverse() as ZodErrorMap[];
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }

  return {
    ...issueData,
    path: fullPath,
    message: errorMessage,
  };
};

export type ParseParams = {
  path: (string | number)[];
  errorMap: ZodErrorMap;
  async: boolean;
};

export type ParsePathComponent = string | number;
export type ParsePath = ParsePathComponent[];
export const EMPTY_PATH: ParsePath = [];

/**
 * @description Defines a set of properties that provide context and information about
 * the parsing process.
 * 
 * Establishes an object type with several read-only properties.
 * Designates the properties as read-only using the `readonly` keyword, ensuring they
 * cannot be modified after creation.
 * 
 * Specifies a common property with three sub-properties:
 * - `issues`: An array of `ZodIssue` objects, which represents any issues encountered
 * during parsing.
 * - `contextualErrorMap`: An optional `ZodErrorMap` object that maps error codes to
 * error messages.
 */
export interface ParseContext {
  readonly common: {
    readonly issues: ZodIssue[];
    readonly contextualErrorMap?: ZodErrorMap;
    readonly async: boolean;
  };
  readonly path: ParsePath;
  readonly schemaErrorMap?: ZodErrorMap;
  readonly parent: ParseContext | null;
  readonly data: any;
  readonly parsedType: ZodParsedType;
}

export type ParseInput = {
  data: any;
  path: (string | number)[];
  parent: ParseContext;
};

/**
 * @description Adds an issue to a context object. It creates an issue object with
 * provided data, error maps from various sources (contextual, schema-bound, override,
 * and default), and pushes it to the context's issues array.
 * 
 * @param {ParseContext} ctx - Used to store parse context information.
 * 
 * @param {IssueData} issueData - Required for creating an issue.
 */
export function addIssueToContext(
  ctx: ParseContext,
  issueData: IssueData
): void {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData: issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap, // contextual error map is first priority
      ctx.schemaErrorMap, // then schema-bound map if available
      overrideMap, // then global override map
      overrideMap === defaultErrorMap ? undefined : defaultErrorMap, // then global default map
    ].filter((x) => !!x) as ZodErrorMap[],
  });
  ctx.common.issues.push(issue);
}

export type ObjectPair = {
  key: SyncParseReturnType<any>;
  value: SyncParseReturnType<any>;
};
/**
 * @description Tracks and updates the parsing status of objects and arrays, providing
 * a way to manage dirty and aborted states while processing results from multiple
 * parsing operations. It ensures consistent status tracking throughout the merging
 * process.
 */
export class ParseStatus {
  value: "aborted" | "dirty" | "valid" = "valid";
  /**
   * @description Changes the value of an instance property from `"valid"` to `"dirty"`.
   * This suggests that the property indicates the state of data parsing, where "valid"
   * represents a valid parse and "dirty" represents an invalid or unparsed state.
   */
  dirty() {
    if (this.value === "valid") this.value = "dirty";
  }
  /**
   * @description Sets the value of an instance variable to "aborted" if it does not
   * already hold that value. This method is used to indicate an abortion or cancellation
   * of a parsing process.
   */
  abort() {
    if (this.value !== "aborted") this.value = "aborted";
  }

  /**
   * @description Takes an object with a status and an array of parse results, and
   * returns a new object with a combined value from the parsed arrays and an updated
   * status. It handles "aborted" and "dirty" statuses accordingly.
   * 
   * @param {ParseStatus} status - Used to track the merge status.
   * 
   * @param {SyncParseReturnType<any>[]} results - An array of parsing results.
   * 
   * @returns {SyncParseReturnType} An object containing two properties: a status
   * property with a specific value and a value property with an array of values.
   */
  static mergeArray(
    status: ParseStatus,
    results: SyncParseReturnType<any>[]
  ): SyncParseReturnType {
    const arrayValue: any[] = [];
    for (const s of results) {
      if (s.status === "aborted") return INVALID;
      if (s.status === "dirty") status.dirty();
      arrayValue.push(s.value);
    }

    return { status: status.value, value: arrayValue };
  }

  /**
   * @description Asynchronously merges an array of key-value pairs into an object,
   * awaiting values for each pair and returning the resulting merged object as a promise.
   * 
   * @param {ParseStatus} status - Used to specify the object status for merging.
   * 
   * @param {{ key: ParseReturnType<any>; value: ParseReturnType<any> }[]} pairs - Used
   * to merge multiple key-value pairs into an object.
   * 
   * @returns {Promise<SyncParseReturnType<any>>} A promise that resolves to an object
   * resulting from merging the provided key-value pairs according to the specified
   * ParseStatus and SyncParseReturnType types.
   */
  static async mergeObjectAsync(
    status: ParseStatus,
    pairs: { key: ParseReturnType<any>; value: ParseReturnType<any> }[]
  ): Promise<SyncParseReturnType<any>> {
    const syncPairs: ObjectPair[] = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value,
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }

  /**
   * @description Merges an array of object pairs into a single object, considering the
   * status and value of each pair. It returns the merged object's status and value if
   * all pairs are valid or aborted; otherwise, it returns an invalid status.
   * 
   * @param {ParseStatus} status - Updated accordingly.
   * 
   * @param {{
   *       key: SyncParseReturnType<any>;
   *       value: SyncParseReturnType<any>;
   *       alwaysSet?: boolean;
   *     }[]} pairs - Used to merge objects.
   * 
   * @returns {SyncParseReturnType} An object with two properties: 'status' and 'value'.
   * The 'status' property holds a value of ParseStatus type and the 'value' property
   * holds the merged object.
   */
  static mergeObjectSync(
    status: ParseStatus,
    pairs: {
      key: SyncParseReturnType<any>;
      value: SyncParseReturnType<any>;
      alwaysSet?: boolean;
    }[]
  ): SyncParseReturnType {
    const finalObject: any = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted") return INVALID;
      if (value.status === "aborted") return INVALID;
      if (key.status === "dirty") status.dirty();
      if (value.status === "dirty") status.dirty();

      if (
        key.value !== "__proto__" &&
        (typeof value.value !== "undefined" || pair.alwaysSet)
      ) {
        finalObject[key.value] = value.value;
      }
    }

    return { status: status.value, value: finalObject };
  }
}
/**
 * @description Defines a type that can represent three different states of parsing
 * results and the corresponding data.
 * 
 * It specifies two properties:
 * 
 * * `status`: This property is expected to be one of three possible values, which
 * are "aborted", "dirty", or "valid". These status values indicate the outcome of
 * the parsing process.
 * * `data`: This property represents any type of data that may have been parsed. The
 * data can be of any type, including numbers, strings, objects, arrays, and others.
 */
export interface ParseResult {
  status: "aborted" | "dirty" | "valid";
  data: any;
}

export type INVALID = { status: "aborted" };
export const INVALID: INVALID = Object.freeze({
  status: "aborted",
});

export type DIRTY<T> = { status: "dirty"; value: T };
export const DIRTY = <T>(value: T): DIRTY<T> => ({ status: "dirty", value });

export type OK<T> = { status: "valid"; value: T };
export const OK = <T>(value: T): OK<T> => ({ status: "valid", value });

export type SyncParseReturnType<T = any> = OK<T> | DIRTY<T> | INVALID;
export type AsyncParseReturnType<T> = Promise<SyncParseReturnType<T>>;
export type ParseReturnType<T> =
  | SyncParseReturnType<T>
  | AsyncParseReturnType<T>;

export const isAborted = (x: ParseReturnType<any>): x is INVALID =>
  (x as any).status === "aborted";
export const isDirty = <T>(x: ParseReturnType<T>): x is OK<T> | DIRTY<T> =>
  (x as any).status === "dirty";
export const isValid = <T>(x: ParseReturnType<T>): x is OK<T> =>
  (x as any).status === "valid";
/**
 * @description Checks whether a given value `x` is an instance of a Promise. It
 * returns a boolean indicating whether `x` can be considered asynchronous, based on
 * its type and the presence of the `Promise` object.
 * 
 * @param {ParseReturnType<T>} x - Checked if it's an instance of Promise.
 * 
 * @returns {x is AsyncParseReturnType<T>} A boolean indicating whether the input `x`
 * is an instance of Promise or not.
 */
export const isAsync = <T>(
  x: ParseReturnType<T>
): x is AsyncParseReturnType<T> =>
  typeof Promise !== "undefined" && x instanceof Promise;
