import {mount} from './vdom.js'
import {h} from './h.js'

export function createApp(rootComponent) {

    const plugins = [];

    const app = {
        use (plugin) {
            plugins.push(plugin);
            return app;
        },
        mount(selector) {
            const container = typeof selector === 'string'
                ? document.querySelector(selector)
                : selector;

            if (!container) throw new Error(`Container "${selector}" not found`);

            plugins.forEach(plugin => {
                if (plugin.install) plugin.install(app)
            });

            //initial mount
            mount(h(rootComponent), container)
            return app;
        }
    }
    return app;
}