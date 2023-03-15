import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

const ICE_SERVERS = (() => {
    if (process.env['ICE_SERVERS']) {
        console.log("Loading ICE servers from ENV...")
        return JSON.parse(process.env['ICE_SERVERS']);
    } else {
        console.log("Using default ICE servers list...");
        return [
            { "urls": "stun:stun.l.google.com:19302" }
        ];
    }
})();

const app = express();
app.get('/iceServers', function (req, res) {
  res.json(ICE_SERVERS);
})

app.listen(3000);