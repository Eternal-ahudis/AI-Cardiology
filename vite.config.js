const { defineConfig } = require('vite');
const fs = require('node:fs');
const path = require('node:path');

function injectCapacitorBridgePlugin() {
    return {
        name: 'inject-capacitor-bridge',
        transformIndexHtml: {
            order: 'pre',
            handler(html) {
                if (html.includes('capacitor-bridge.js')) return html;
                return html.replace(
                    '</body>',
                    '    <script type="module" src="./resources/js/capacitor-bridge.js"></script>\n</body>'
                );
            }
        }
    };
}

/**
 * Copies static runtime folders under resources/ into dist-mobile/resources/,
 * keeping classic defer scripts, stylesheets, and SVGs intact while ignoring
 * Electron files (electron-main.js) and Vite-bundled ESM entry modules.
 */
function copyStaticResourcesPlugin() {
    return {
        name: 'copy-static-resources',
        closeBundle() {
            const srcResources = path.resolve(__dirname, 'resources');
            const outResources = path.resolve(__dirname, 'dist-mobile', 'resources');

            if (!fs.existsSync(srcResources)) return;
            fs.mkdirSync(outResources, { recursive: true });

            fs.cpSync(srcResources, outResources, {
                recursive: true,
                filter: (srcPath) => {
                    const normalized = srcPath.replace(/\\/g, '/');
                    if (normalized.endsWith('/capacitor-bridge.js')) return false;
                    if (normalized.endsWith('/electron-main.js')) return false;
                    return true;
                }
            });
        }
    };
}

module.exports = defineConfig({
    root: __dirname,
    base: './',
    publicDir: false,
    server: {
        host: true,
        port: 5173
    },
    build: {
        outDir: 'dist-mobile',
        emptyOutDir: true,
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html')
            },
            external: ['electron']
        }
    },
    optimizeDeps: {
        exclude: ['electron']
    },
    plugins: [injectCapacitorBridgePlugin(), copyStaticResourcesPlugin()]
});
