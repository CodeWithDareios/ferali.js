export function defineComponent(options) {
    return {
        name: options.selector || 'AnonymousComponent',
        ...options,
        __isComponent: true
    }
}