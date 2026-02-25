import {isArray, isString} from "./utils.js";

export const Text = Symbol('Text');
export const Fragment = Symbol('Fragment');

export function createVNode(tag, props, children) {
    return {
        tag,
        props: props || {},
        children,
        ell: null,
        component: null,
        key: props && props.key ? props.key : null
    };
}

export function h(tag, props = null, children = null) {

    if (tag === Text) return createVNode(Text, props, String(children));

    if (children === null) children = [];
    else if (!isArray(children)) children = [children];

    children = children.map(child => {
        if (isString(child) || typeof child === 'number') return createVNode(Text, null, String(child));
        return child;
    });

    return createVNode(tag, props, children);

}