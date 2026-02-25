//@ts-nocheck
import {h, Text, Fragment} from './h.js';
import {currentInstance} from "./vdom.js";


function processText(text, scope) {
    if (text.includes('{{')) return h(Text, null, text);
    return h(Text, null, interpolate(text, scope));
}

function domToVNode(domNode, scope, components) {

    if (domNode.type === Node.TEXT_NODE) {
        const text = domNode.textContent;
        if (!text.trim() && text.includes('\n')) return null;
        return processText(text, scope);
    }

    if (domNode.nodeType === Node.ELEMENT_NODE) {
        const tagNameRaw = domNode.tagName.toLowerCase();

        let tag = tagNameRaw;

        const pascalCase = tagNameRaw.replace(/-(\w)/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase());
        const camelCase = tagNameRaw.replace(/-(\w)/g, (_, c) => c.toUpperCase());

        if (components[pascalCase]) {
            tag = components[pascalCase];
        } else if (components[camelCase]) {
            tag = components[camelCase];
        } else if (components[tagNameRaw]) {
            tag = components[tagNameRaw];
        }

        const props = {};

        Array.from(domNode.attributes).forEach(attr => {
            const name = attr.name;
            const value = attr.value;

            if (name.startsWith('@')) {
                const eventName = 'on' + name.slice(1);
                if (scope) {
                    if (typeof scope[value] === 'function') {
                        props[eventName] = scope[value].bind(scope);
                    } else {
                        console.warn(`[Ferali] Method "${value}" not found in component state.`);
                    }
                }
            } else {
                props[name] = value;
            }
        });

        const children = Array.from(domNode.childNodes)
            .map(child => domToVNode(child, scope, components))
            .filter(Boolean);

        return h(tag, props, children);
    }

    return null;

}

//Identity tags for syntax highlighting ('es6-string-html', 'lit-html', ...)
export function html(strings, ...values) {
    return strings.reduce((acc, str, i) => acc + str  + (values[i] || ''), '');
}

export function css(strings, ...values) {
    return strings.reduce((acc, str, i) => acc + str  + (values[i] || ''), '');
}

export function interpolate(text, scope) {
    if (!text && !text.includes('{{')) return text;
    return text.replace(/\{\{(.*?)\}\}/g, (_, exp) => {
        const expression = exp.trim();
        try {
            const fn = new Function('scope', `with(scope) {return ${expression};}`);
            const result = fn(scope);
            return result !== undefined ? result : '';
        } catch (e) {
            console.warn(`[Ferali] Failed to evaluate expression: {{ ${expression} }}`, e.message);
            return '';
        }
    })
}

export function useTemplate(template, scope = null) {

    const instance = currentInstance;
    if (!instance) throw new Error("useTemplate must be called inside a component render function.");

    const targetScope = scope || instance.state;
    const components = instance.vnode.tag.components || {};

    instance.lastRenderScope = targetScope;

    return compile(template, targetScope, components);

}

//MAIN function
export function compile(template, scope, components = {}) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(template, 'text/html');
    const children = Array.from(doc.body.children);

    const vNodes = children.map(node => domToVNode(node, scope, components).filter(v => v !== null));

    if (vNodes.length === 1) return vNodes[0];
    return h(Fragment, null, vNodes);
}