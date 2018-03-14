var path = require('path');
module.exports = {
    mode: 'development',
    context: path.resolve(__dirname),
    entry: "./entry.js",
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                type: 'javascript/auto',
                test: /\.font\.(js|json)$/,
                loader: "style-loader!css-loader!" + require.resolve("../")
            },
            {
                test: /\.(woff|eot|ttf|svg)$/,
                loader: "url-loader"
            }
        ]
    }
};
