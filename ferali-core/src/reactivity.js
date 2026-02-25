import {isObject} from "./utils.js";

const targetMap = new WeakMap();
let activeEffect = null;

export function effect(fn) {
    const effectFn = () => {
        activeEffect = effectFn;
        try {
            return fn();
        } finally {
            activeEffect = null;
        }
    }
    effectFn()
    return effectFn;
}

export function track(target, key) {
    if (!activeEffect) return;

    let depsMap = targetMap.get(target);
    if (!depsMap) targetMap.set(target, (depsMap = new Map()));

    let deps = depsMap.get(key);
    if (!deps) depsMap.set(key, (deps = new Set()));
    deps.add(activeEffect);
}

export function trigger(target, key) {

    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const dep = depsMap.get(key);
    if (dep) dep.forEach(effect => effect());

}

export function reactive(target) {
    if (!isObject(target)) return target;

    const handler = {
        get(target, key, receiver) {

            //TODO: incorporate dependencies tracker - FINISHED
            track(target, key);
            return Reflect.get(target, key, receiver);

        },
        set(target, key, value, receiver) {

            const oldValue = target[key];
            const result = Reflect.set(target, key, value, receiver);
            if (oldValue !== value) {
                trigger(target, key);
            }
            return result;

        }
    }

    return new Proxy(target, handler);
}