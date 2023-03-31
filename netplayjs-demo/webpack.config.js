const path = require("path");
const { merge } = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const url = require("url");
const CopyPlugin = require("copy-webpack-plugin");

const EXAMPLES = [
  {
    chunkName: "pong",
    entry: "./src/examples/pong.ts",
    title: "NetplayJS Pong Example",
  },
  {
    chunkName: "fps",
    entry: "./src/examples/fps.ts",
    title: "NetplayJS FPS Example",
  },
  {
    chunkName: "emulator",
    entry: "./src/examples/emulator.ts",
    title: "NetplayJS Emulator Example",
  },
  {
    chunkName: "simple",
    entry: "./src/examples/simple.ts",
    title: "NetplayJS Simple Game Example",
  },
  {
    chunkName: "physics",
    entry: "./src/examples/physics.ts",
    title: "NetplayJS Physics Game Example",
  },
  {
    chunkName: "local",
    entry: "./src/examples/local.ts",
    title: "NetplayJS Local Testing Example",
  },
];

const ENTRIES = {};
const PLUGINS = [];

const GITHUB_ROOT =
  "https://github.com/rameshvarun/netplayjs/tree/master/netplayjs-demo/";

for (let example of EXAMPLES) {
  ENTRIES[example.chunkName] = example.entry;
  PLUGINS.push(
    new HtmlWebpackPlugin({
      template: "./src/example.html",
      filename: example.chunkName + "/index.html",
      chunks: [example.chunkName],
      templateParameters: {
        title: example.title,
        githubURL: url.resolve(GITHUB_ROOT, example.entry),
      },
    })
  );
}

PLUGINS.push(
  new CopyPlugin({
    patterns: [{ from: "src/index.html", to: "index.html" }],
  }),
  new CopyPlugin({
    patterns: [{ from: "src/files/", to: "files" }],
  })
);

const common = {
  entry: ENTRIES,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: PLUGINS,
};

const development = {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    contentBase: "./dist",
    host: "0.0.0.0",
    useLocalIp: true,
    https: true,
  },
};

const production = {
  mode: "production",
};

module.exports = (env) => {
  if (env.development) return merge(common, development);
  else if (env.production) return merge(common, production);
  else {
    throw new Error(`Unknown environment ${env}.`);
  }
};
