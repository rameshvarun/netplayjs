import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as cors from 'cors';

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
app.use(cors());

app.get('/iceservers', function (req, res) {
  res.json(ICE_SERVERS);
})

app.get('/', function (req, res) {
    res.send("NetplayJS");
})

app.listen(process.env.PORT || 3000);