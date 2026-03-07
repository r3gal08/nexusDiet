const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
    const manifestFile = env.MANIFEST_VER === '2' ? 'manifest.v2.json' : 'manifest.v3.json';
    console.log(`Building for Manifest V${env.MANIFEST_VER || '3'} using ${manifestFile}`);

    return {
        entry: {
            background: './src/background/background.js',
            content: './src/content/content.js',
            popup: './src/popup/popup.js',
            dashboard: './src/dashboard/dashboard.js'
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'dist'),
            clean: true,
        },
        mode: 'production',
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: manifestFile, to: "manifest.json" },
                    { from: "src/popup/popup.html", to: "." },
                    { from: "src/dashboard/dashboard.html", to: "." },
                ],
            }),
        ],
    };
};
