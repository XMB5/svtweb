const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack= require('webpack');

module.exports = {
    entry: './src/public/index.js',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'svtweb',
            template: './src/public/index.ejs'
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'
        })
    ]
};