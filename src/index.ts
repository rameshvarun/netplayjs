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
app.get('/iceservers', function (req, res) {
  res.json(ICE_SERVERS);
})

app.get('/', function (req, res) {
    res.send("NetplayJS");
})

app.listen(3000);