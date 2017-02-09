var path = require('path');
module.exports = {
    context: path.resolve(__dirname),
    entry: "./entry.js",
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        loaders: [
            {
                test: /\.font\.(js|json)$/,
                loader: "style-loader!css-loader!" + require.resolve("../")
            }, {
                test: /\.(woff|eot|ttf|svg)$/,
                loader: "url-loader"
            }
        ]
    }
};
