var path = require('path');
var webpack = require('webpack');

var config = require("./webpack.config.js");

var compiler = webpack(config);

console.log('Compilation started...');
compiler.run(function() {
    console.log('Completed.');
});

// Test via web server
// var WebpackDevServer = require('webpack-dev-server');
// var server = new WebpackDevServer(compiler, {
//     contentBase: path.resolve(__dirname),
//     publicPath: '/',
//     stats: {
//         colors: true
//     }
// });
// server.listen(8012);
