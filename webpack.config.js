const path = require("node:path");

module.exports = {
    mode: "production",
    entry: "./index.b.js",
    output: {
        filename: 'ape.min.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
        library: {
            type: "window",
        }
    },
    optimization: {
        minimize: true,
    },
    target: "web",
};
