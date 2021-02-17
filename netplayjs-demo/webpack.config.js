const path = require("path");
const {merge} = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const common = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      title: 'NetplayJS Demo'
    }),
  ]
};

const development = {
  mode: 'development',
  devtool: "inline-source-map",
  devServer: {
    contentBase: "./dist",
    host: "0.0.0.0",
    useLocalIp: true,
    https: true
  },
}

const production = {
  mode: 'production',
}

module.exports = (env) => {
  if (env.development) return merge(common, development);
  else if (env.production) return merge(common, production);
  else {
    throw new Error(`Unknown environment ${env}.`);
  }
}
