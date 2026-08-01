const { withAndroidManifest } = require('@expo/config-plugins');

// Android 11+ (API 30) hides other installed apps from Linking.canOpenURL /
// PackageManager unless they're declared in <queries>. This plugin adds
// Telegram's package name so `tg://resolve?domain=...` deep links can be
// detected and opened. Without this, canOpenURL('tg://...') silently
// returns false even when Telegram is installed.
const TELEGRAM_PACKAGE = 'org.telegram.messenger';

module.exports = function withTelegramQueries(config) {
    return withAndroidManifest(config, (config) => {
        const manifest = config.modResults.manifest;

        // <queries> is a sibling of <application>, directly under <manifest>.
        if (!manifest.queries) {
            manifest.queries = [{}];
        }

        const queriesBlock = manifest.queries[0];
        if (!queriesBlock.package) {
            queriesBlock.package = [];
        }

        const alreadyDeclared = queriesBlock.package.some(
            (entry) => entry?.$?.['android:name'] === TELEGRAM_PACKAGE
        );

        if (!alreadyDeclared) {
            queriesBlock.package.push({
                $: { 'android:name': TELEGRAM_PACKAGE },
            });
        }

        return config;
    });
};