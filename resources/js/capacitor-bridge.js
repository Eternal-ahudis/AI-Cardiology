import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

async function initCapacitorPlugins() {
    if (!Capacitor.isNativePlatform()) {
        return;
    }

    try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } catch (_err) {
        // Ignore on platforms/devices that do not support a StatusBar method
    }

    try {
        await SplashScreen.hide();
    } catch (_err) {
        // Ignore if splash screen is already hidden
    }

    App.addListener('backButton', ({ canGoBack }) => {
        const handled = globalThis.EcgApp?.navigation?.handleBackButton?.();
        if (handled) {
            return;
        }
        if (canGoBack) {
            window.history.back();
            return;
        }
        App.exitApp();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        void initCapacitorPlugins();
    });
} else {
    void initCapacitorPlugins();
}
