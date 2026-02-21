const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        background: './background.js',
        content: './content.js',
        popup: './popup.js',
        dashboard: './dashboard.js'
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
                { from: "popup.html", to: "." },
                { from: "dashboard.html", to: "." },
                // Copy icons if you had any, e.g. { from: "icons", to: "icons" }
            ],
        }),
    ],
};
