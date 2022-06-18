process.env.CHROME_BIN = require('puppeteer').executablePath();
const webpack = require('webpack');
module.exports = function (config) {
  config.set({
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-webpack',
      'karma-spec-reporter',
      require('./tests/karma-polly.cjs'),
    ],
    basePath: './',
    frameworks: ['jasmine', 'webpack', 'polly'],
    files: [
      { pattern: 'tests/karma-setup.js', watched: false },
      { pattern: 'tests/integration/*.ts', watched: false },
    ],
    reporters: ['spec'],
    preprocessors: {
      'tests/integration/*.ts': ['webpack'],
      'tests/karma-setup.js': ['webpack'],
    },
    pollyConfig: {
      recordings: './tests/__recordings__/browser',
      port: 3000,
    },

    browsers: ['Chrome_without_security'],
    customLaunchers: {
      Chrome_without_security: {
        base: 'ChromeHeadless',
        flags: ['--disable-web-security', '--disable-site-isolation-trials'],
      },
    },
    webpack: {
      watch: true,
      resolve: {
        fallback: {
          path: require.resolve('path-browserify'),
          util: require.resolve('util/'),
          fs: false,
          url: require.resolve('url/'),
          process: require.resolve('process/browser'),
          module: false,
          crypto: false,
          process: require.resolve('process/browser'),
          stream: false,
          assert: require.resolve('assert/'),
          http: false,
          https: false,
          os: require.resolve('os-browserify'),
          buffer: false,
        },
        extensions: ['.ts', '.js', '.cjs'],
      },
      plugins: [
        new webpack.DefinePlugin({
          __isBrowser__: 'true',
        }),
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        }),
      ],
      module: {
        rules: [
          { test: /graceful-fs/, use: 'null-loader' },
          { test: /pollyjs\/persister-fs/, use: 'null-loader' },
          { test: /pollyjs\/adapter-node-http/, use: 'null-loader' },
          { test: /requireOrImportModule/, use: 'null-loader' },
          {
            test: /\.ts$/,
            use: [
              {
                loader: 'ts-loader',
                options: {
                  transpileOnly: true,
                  configFile: 'tsconfig.json',
                },
              },
            ],
            exclude: /node_modules/,
          },
        ],
      },
    },
  });
};
