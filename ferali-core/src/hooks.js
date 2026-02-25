import { currentInstance } from "./vdom.js";

export function useState(initialValue) {
    const instance = currentInstance;
    if(!instance) throw new Error("useState must be called inside a component setup/render function!");

    const hookIndex = instance.hookCursor++;
    const hooks = instance.hooks;

    if (hookIndex >= hooks.length) hooks.push({
        value: typeof initialValue === 'function' ? initialValue() : initialValue
    });

    const hook = hooks[hookIndex];

    const setState = (newValue) => {
        const nextValue = typeof newValue === 'function' ? newValue() : newValue;
        if (nextValue !== hook.value) {
            hook.value = nextValue;
            if (instance.update) instance.update();
        }
    }
    return [hook.value, setState];
}

export function useEffect(callback, deps) {
    if (!currentInstance) throw new Error("useEffect must be called inside a component setup/render function!");

    const hookIndex = currentInstance.hookCursor++;
    const hooks = currentInstance.hooks;

    if (hookIndex >= hooks.length) {
        hooks.push({
            deps: undefined,
            cleanup: undefined
        });
    }

    const hook = hooks[hookIndex];
    const hasChanged = !hook.deps || !deps || deps.some((d, i) => d !== hooks.deps[i]);

    if (hasChanged) {
        hooks.deps = deps;
        currentInstance.effects.push({
            callback,
            cleanup: hook.cleanup,
            hook
        });
    }
}