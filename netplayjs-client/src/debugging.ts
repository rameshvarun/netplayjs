import * as log from "loglevel";

export const DEV: boolean = process.env.NODE_ENV === "development";

if (DEV) {
  log.enableAll();
}
