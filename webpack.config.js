/*
 ./webpack.config.js
 */
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
module.exports = {
    devtool: "cheap-eval-source-map",
    entry: path.resolve(__dirname, 'public/src/jsx/index.jsx'),
    output: {
        path: path.resolve(__dirname, 'public/dist/js'),
        filename: 'app_bundle.js'
    },
    module: {
        loaders: [
            { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/ },
            { test: /\.jsx$/, loader: 'babel-loader', exclude: /node_modules/ },
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract('css-loader?sourceMap!sass-loader?sourceMap')
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin({
            filename: '../css/app.css',
            allChunks: true
        })
    ]
}