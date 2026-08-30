const path = require('path')

const svgIconFolders = [
  path.resolve(__dirname, 'source/common/modules/window-register/icons'),
  path.resolve(__dirname, 'source/common/modules/markdown-editor/table-editor/icons')
]

module.exports = [
  {
    test: /\.vue$/,
    loader: 'vue-loader',
    options: {
      compilerOptions: {
        isCustomElement: tag => tag === 'cds-icon'
      }
    }
  },
  {
    test: /\.css$/,
    use: ['style-loader', 'css-loader']
  },
  {
    test: /\.(png|jpe?g|svg|gif|woff2?|eot|ttf|otf|ogg|mp3|wav)$/,
    type: 'asset/resource',
    exclude: svgIconFolders
  },
  {
    test: /\.svg$/,
    type: 'asset/source',
    include: svgIconFolders
  },
  {
    test: /\.glsl$/,
    type: 'asset/source'
  },
  {
    test: /(.ts|.tsx)$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: { transpileOnly: true, appendTsSuffixTo: [/\.vue$/] }
    }
  }
]
