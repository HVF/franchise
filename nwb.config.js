var StatsPlugin = require('stats-webpack-plugin')
var webpack = require('webpack')

module.exports = {
    type: 'react-app',
    webpack: {
        node: {
            fs: 'empty',
            net: 'empty',
            tls: 'empty',
        },
        extra: {
            plugins: [
                new StatsPlugin('stats.json', {
                    chunkModules: true,
                }),
                new webpack.ContextReplacementPlugin(
                    /graphql-language-service-interface[\\/]dist$/,
                    new RegExp(`^\\./.*\\.js$`)
                ),
            ],
        },

        publicPath: '',
        uglify: {
            compress: {
                warnings: false,
            },
            output: {
                comments: false,
            },
            sourceMap: true,
            exclude: /worker\.js/,
        },
    },
    babel: {
        stage: 1,
        // cherryPick: 'lodash',
        // runtime: false,
        // presets: [["env", {
        //     loose: true,
        //     targets: {
        //         chrome: 59
        //     }
        // }]]
    },
}
