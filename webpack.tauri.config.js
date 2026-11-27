const CopyWebpackPlugin = require('copy-webpack-plugin')
const rendererConfig = require('./webpack.renderer.config')
const path = require('path')

// Keep the existing renderer loaders, aliases and Vue settings.  This config
// deliberately has no Electron Forge entrypoint/preload integration.
module.exports = {
  ...rendererConfig,
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  // Tauri's CSP rejects eval-based source maps. Disable development maps as
  // well: this keeps the Tauri dev bundle small enough to start promptly.
  devtool: false,
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack-tauri')
  },
  // Keep the bootstrap small. Heavy editor/viewer dependencies are loaded
  // through async Vue components and should not block the first paint.
  optimization: {
    splitChunks: {
      // Keep CSS and third-party modules from nested async views out of the
      // first request. The default async-only split preserves the first
      // paint while still caching heavy feature chunks.
      chunks: 'async',
      maxInitialRequests: Infinity,
      minSize: 20000
    }
  },
  entry: {
    tauri: './source/tauri/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist-tauri'),
    filename: '[name].js',
    clean: true
  },
  plugins: [
    ...rendererConfig.plugins,
    new CopyWebpackPlugin({
      patterns: [
        { from: 'static/tauri-index.htm', to: 'index.html' }
      ]
    })
  ],
  devServer: {
    static: path.resolve(__dirname, 'dist-tauri'),
    port: 1420,
    hot: false,
    liveReload: true,
    historyApiFallback: true
  }
}
