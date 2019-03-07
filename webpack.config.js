const path = require("path");
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const common = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ["file-loader"]
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      title: 'NetplayJS Demo'
    }),
  ]
};

const dev = {
  mode: 'development',
  devtool: "inline-source-map",
  devServer: {
    contentBase: "./dist"
  },
}

const prod = {
  mode: 'production',
}

module.exports = (env) => {
  if (env === 'dev') return merge(common, dev);
  else if (env === 'prod') return merge(common, prod);
  else {
    throw new Error(`Unknown environment ${env}.`);
  }
}
