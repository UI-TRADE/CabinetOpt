const path = require('path');
const copyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require("webpack");

module.exports = {
    mode: 'development',
    entry: './src/js/index.js',
    output: {
        path: path.resolve(__dirname, 'static'),
        filename: 'main.js',
        publicPath: '/static/',
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                use: [
                  {
                    loader: 'file-loader',
                    options: {
                      name: '[name].[ext]'
                    }
                  },
                ],
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                        options: {
                        presets: [
                            ['@babel/preset-env', { targets: "defaults" }]
                        ]
                    }
                }
            },
        ],
    },
    devServer: {
        port: 8081,
        devMiddleware: {
            writeToDisk: true,
        }
    },
    plugins: [
        new copyWebpackPlugin({
          patterns: [
            { from: './node_modules/font-awesome', to: './font-awesome' },
            { from: './src/fonts', to: './fonts' },
            { from: './src/img', to: './img' },
            { from: './src/xlsx', to: '' }
          ],
        }),
        new webpack.ProvidePlugin({
            $: require.resolve('jquery'),
            jQuery: require.resolve('jquery')
        }),
    ],
}