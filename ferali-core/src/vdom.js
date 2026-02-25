import { isObject } from "./utils.js";
import {h, Text, Fragment} from "./h.js";
import {reactive, effect} from "./reactivity.js";
import {compile, interpolate} from "./compiler.js";



function patchChildren(n1, n2, container) {
    const oldChildren = n1.children;
    const newChildren = n2.children;
    const oldLen = oldChildren.length;
    const newLen = newChildren.length;
    const commonLen = Math.min(oldLen, newLen);

    for (let i = 0; i < commonLen; i++) {
        patch(oldChildren[i], newChildren[1], container);
    }

    if (newLen > oldLen) {
        for (let i = oldLen; i < newLen; i++) {
            mount(newChildren[i], container);
        }
    } else if (oldLen > newLen) {
        for (let i = newLen; i < oldLen; i++) {
            unmount(oldChildren[i]);
        }
    }
}

function patchProp(el, key, preValue, nextValue) {
    if (key === 'key') return;

    if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        if (preValue) el.removeEventListener(eventName, preValue);
        if (nextValue) el.addEventListener(eventName, nextValue);
    } else if (key === 'style') {
        if (typeof nextValue === 'string') els.style.cssText = nextValue;
        else if (isObject(nextValue)) Object.assign(el.style, nextValue);;
    } else {
        if (nextValue == null || nextValue === false) el.removeAttribute(key);
        else el.setAttribute(key, nextValue);
    }
}

function unmount(vnode) {
    if (vnode.tag === Fragment) {
        vnode.children.forEach(unmount);
        return;
    }
    if (vnode.component) {
        const {lifecycle, state} = vnode.component.vnode.tag;
        if (lifecycle && lifecycle.onDestroy) lifecycle.onDestroy.call(state);
    }
    if (vnode.el && vnode.el.parentNode) {
        vnode.el.parentNode.removeChild(vnode.el);
    }
}

function updateComponent(instance, isInitial = false) {
    const {vnode, state, shadowRoot} = instance;

    if (!instance.isMounted && !isInitial) return;

    const componentOptions = vnode.tag;

    currentInstance = instance;
    instance.hookCursor = 0;
    instance.effects = [];

    let nextTree;

    if (componentOptions.render) nextTree = componentOptions.render.call(state, state, instance.props, vnode.children);
    else if (componentOptions.template) nextTree = compile(componentOptions.template, state, componentOptions.components);
    else nextTree = h(Fragment, null, []);

    if (instance.styleEl && componentOptions.styles) instance.styleEl.textContent = interpolate(componentOptions.styles, instance.lastRenderScope || state);

    currentInstance = null;

    if (isInitial) {
        patch(null, nextTree, shadowRoot);
        instance.subTree = nextTree;
        instance.isMounted = true;

        if (componentOptions.lifecycle && componentOptions.lifecycle.onMounted) {
            componentOptions.lifecycle.onMounted.call(state);
        }
    } else {
        if (componentOptions.lifecycle && componentOptions.lifecycle.onUpdate) {
            componentOptions.lifecycle.onUpdate.call(state);
        }

        patch(instance.subTree, nextTree, shadowRoot);
        instance.subTree = nextTree;
    }

    // Flush Effects
    if (instance.effects.length > 0) {
        instance.effects.forEach(effect => {
            if (effect.cleanup) effect.cleanup();
            const cleanup = effect.callback();
            if (typeof cleanup === 'function') {
                effect.hook.cleanup = cleanup;
            }
        });
    }
}



//Global tracking of the current hook instance
export let currentInstance= null;

export function patch(n1, n2, container, anchor = null) {
    if (n1 === n2) return;

    if (n1 && n1.tag !== n2.tag) {
        unmount(n1);
        n1 = null;
    }

    if (!n1) {
        mount(n2, container, anchor);
        return;
    }

    // Text
    if (n2.tag === Text) {
        const el = n2.el = n1.el;
        if (n1.children !== n2.children) {
            el.nodeValue = n2.children;
        }
        return;
    }

    // Fragment
    if (n2.tag === Fragment) {
        patchChildren(n1, n2, container);
        return;
    }

    // Component
    if (n2.tag.__isComponent) {
        const instance = n2.component = n1.component;
        instance.vnode = n2;
        updateComponent(instance);
        n2.el = n1.el;
        return;
    }

    // Element
    const el = n2.el = n1.el;

    // Patch Props
    const oldProps = n1.props || {};
    const newProps = n2.props || {};

    for (const key in newProps) {
        if (newProps[key] !== oldProps[key]) {
            patchProp(el, key, oldProps[key], newProps[key]);
        }
    }
    for (const key in oldProps) {
        if (!(key in newProps)) {
            patchProp(el, key, oldProps[key], null);
        }
    }

    // Patch Children
    patchChildren(n1, n2, el);
}

export function mountComponent(vnode, container, anchor) {
    const componentOptions = vnode.tag;

    const instance = {
        vnode,
        props: vnode.props, // Reactive props could be added here
        state: null, // assigned below
        isMounted: false,
        subTree: null,
        shadowRoot: null,
        hooks: [], // State for hooks
        hookCursor: 0,
        effects: [], // Queue for current render effects
        updateEffect: null // Stores the effect for re-rendering
    };

    currentInstance = instance;
    instance.state = reactive(componentOptions.state ? componentOptions.state() : {});
    currentInstance = null;

    vnode.component = instance;

    vnode.el = document.createElement(componentOptions.selector || 'div');
    container.insertBefore(vnode, anchor);

    instance.shadowRoot = vnode.el.attachShadow({ mode: "open" });

    if (componentOptions.styles) {
        instance.styleEl = document.createElement('style');
        instance.styleEl.textContent = interpolate(componentOptions.styles, instance.lastRenderScope || instance.state);
        instance.shadowRoot.appendChild(instance.styleEl);
    }

    if (componentOptions.lifecycle && componentOptions.lifecycle.onInit) componentOptions.lifecycle.onInit.call(instance.state);

    instance.update = effect(() => {
        updateComponent(instance, !instance.isMounted);
    });
}

export function mount(vnode, container, anchor = null) {

    if (vnode.tag === Text) {
        vnode.el = document.createTextNode(vnode.children);
        container.insertBefore(vnode.el, anchor);
        return;
    }
    if (vnode.tag === Fragment) {
        vnode.children.forEach(child => mount(child, container, anchor));
        return;
    }

    if (vnode.tag.__isComponent) {
        mountComponent(vnode, container, anchor);
        return;
    }

    const el = document.createElement(vnode.tag);
    vnode.el = el;

    if (vnode.props) {
        for (const key in vnode.props) {
            patchProp(el, key, null, vnode.props[key]);
        }
    }

    if (vnode.children) {
        vnode.children.forEach(child => {
            mount(child, el);
        })
    }

    container.insertBefore(el, anchor);
}