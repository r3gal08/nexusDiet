const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        background: './src/background/background.js',
        content: './src/content/content.js',
        popup: './src/popup/popup.js',
        dashboard: './src/dashboard/dashboard.js'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true, // Clean the output directory before emit
    },
    mode: 'production', // Use 'development' for better debugging maps
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "manifest.json", to: "." },
                { from: "src/popup/popup.html", to: "." },
                { from: "src/dashboard/dashboard.html", to: "." },
                // Copy icons if you had any, e.g. { from: "icons", to: "icons" }
            ],
        }),
    ],
};
