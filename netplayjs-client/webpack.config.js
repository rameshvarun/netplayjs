const path = require("path");
const {merge} = require('webpack-merge');

const common = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    library: 'netplayjs',
    libraryTarget: 'umd',
  },
};

const development = {
  mode: 'development',
  devtool: "source-map",
  output: {
    filename: "netplay.js",
  },
}

const production = {
  mode: 'production',
  devtool: "source-map",
  output: {
    filename: "netplay.min.js",
  },
}

module.exports = (env) => {
  if (env.development) return merge(common, development);
  else if (env.production) return merge(common, production);
  else {
    throw new Error(`Unknown environment ${env}.`);
  }
}
