export const isString = (val) => typeof val === 'string';
export const isObject = (val) => val !== null && typeof val === 'object';
export const isFunction = (val) => typeof val === 'function';
export const isArray = (val) => Array.isArray(val);

export const EMPTY_OBJ = {};
export const EMPTY_ARR = [];

export function hasOwn(val, key) {
    return Object.prototype.hasOwnProperty.call(val, key);
}
