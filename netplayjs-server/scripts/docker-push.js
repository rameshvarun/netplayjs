const shell = require("shelljs");
const path = require("path");

const VERSION = require("../package.json").version;

shell.exec("docker tag netplayjs-server:latest varunramesh/netplayjs-server:latest")
shell.exec(`docker tag netplayjs-server:latest varunramesh/netplayjs-server:${VERSION}`)

shell.exec("docker push varunramesh/netplayjs-server:latest")
shell.exec(`docker push varunramesh/netplayjs-server:${VERSION}`)
