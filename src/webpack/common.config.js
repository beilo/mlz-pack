const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin').CleanWebpackPlugin;
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');
const autoprefixer = require('autoprefixer');
const pxtorem = require('postcss-pxtorem');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const SentryPlugin = require('webpack-sentry-plugin');
// const AutoDllPlugin = require('autodll-webpack-plugin');

const configs = require('./config');


module.exports = () => {
  const config = configs.get();
  const tsconfig = config.tsconfig ? {configFile: config.tsconfig} : {};
  const scssRules = [
    {
      loader: 'css-loader',
      options: {
        modules: {
          localIdentName: config.cssScopeName,
          context: process.cwd(),
        },
        importLoaders: 3,
        sourceMap: false,
      },
    },
    {
      loader: 'postcss-loader',
      options: {
        plugins: () => {
          const plugin = [autoprefixer()];
          if (config.pxtorem) {
            plugin.push(pxtorem(config.pxtorem));
          }
          return plugin;
        },
      },
    },
    'sass-loader',
  ];

  if (!config.isDev) {
    scssRules.unshift({ loader: MiniCssExtractPlugin.loader });
  } else {
    scssRules.unshift('style-loader');
  }

  const commonConfig = {
    entry: config.entryPath,
    output: {
      // 打包输出的文件
      path: config.buildPath,
      publicPath: config.publicPath,
    },
    resolve: {
      modules: [
        config.rootPath,
        'node_modules',
      ],
      alias: {
        ...config.alias,
      },
      extensions: ['.ts', '.tsx', '.js', '.css', '.scss'],
      symlinks: false,
      cacheWithContext: false,
      plugins: [new TsconfigPathsPlugin(tsconfig)],
    },
    watchOptions: {
      poll: 1000,
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          // include: /node_modules/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => {
                  return [
                    autoprefixer(),
                  ];
                },
              },
            },
          ],
        },
        {
          test: /\.scss$/,
          exclude: /node_modules/,
          use: [...scssRules],
        },
        {
          test: /\.(jpe?g|png|gif)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'url-loader',
              options: {
                emitFile: true,
                limit: 3 * 1024,
                name: 'images/[name]__[hash:5].[ext]',
                publicPath: config.publicPath,
              },
            }
          ],
        },
        {
          test: /\.svg$/,
          use: [
            '@svgr/webpack',
            {
              loader: 'url-loader',
              options: {
                emitFile: true,
                limit: 3 * 1024,
                name: 'images/[name]__[hash:5].[ext]',
                publicPath: config.publicPath,
              },
            },
          ],
        },
        {
          test: /\.(woff|woff2|eot|ttf|mp3|mp4)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'assets/[name]__[hash:5].[ext]',
                publicPath: config.publicPath,
              },
            },
          ],
        },
        {
          test: /\.(ts|tsx)?$/,
          use: 'happypack/loader?id=ts',
          exclude: /(node_modules)/,
        },
        {
          test: /\.worker\.js$/,
          use: [
            {
              loader: 'worker-loader',
              options: {
                name: '[name].js',
                inline: true,
              },
            },
          ],
          exclude: /(node_modules)/,
        },
      ],
    },
    plugins: [
      new ProgressBarPlugin(),
      new FriendlyErrorsWebpackPlugin(),
      new CleanWebpackPlugin({
        verbose: true, // Write logs to console.
        dry: false,
      }),
      new webpack.DefinePlugin({
        'DEBUG': config.isDev,
        ...config.definePlugin,
      }),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      
    ],
  };
  if (config.analyzePlugin) {
    commonConfig.plugins.push(new BundleAnalyzerPlugin());
  }
  if (config.sentryPlugin) {
    let version = '0.0.1';
    try {
      version = require(path.resolve(process.cwd(), 'package.json')).version
    } catch(e) {
      console.log(e);
    }
    commonConfig.devtool = 'source-map';
    commonConfig.plugins.push(new SentryPlugin({
      release: version,
      suppressConflictError: true,
      deleteAfterCompile: true,
      filenameTransform: function(filename) {
        return config.publicPath + filename;
      },
      baseSentryURL: 'https://sentry.codemao.cn/api/0',
      ...config.sentryPlugin,
    }));
  }
  if (config.loaderOptions) {
    commonConfig.module.rules.push(...config.loaderOptions);
  }
  if (config.pluginOptions) {
    commonConfig.plugins.push(...config.pluginOptions);
  }

  

  return commonConfig;
};