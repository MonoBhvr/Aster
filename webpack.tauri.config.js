const CopyWebpackPlugin = require('copy-webpack-plugin')
const rendererConfig = require('./webpack.renderer.config')
const path = require('path')

// Keep the existing renderer loaders, aliases and Vue settings.  This config
// deliberately has no Electron Forge entrypoint/preload integration.
module.exports = {
  ...rendererConfig,
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  // Tauri enforces the renderer CSP in development too; eval-based source
  // maps make the entire bundle fail before Vue can mount.
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack-tauri')
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
