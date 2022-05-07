import fetch from "node-fetch";
import { Config } from "./config.js";
import jwt from "jsonwebtoken";
import bunyan from "bunyan";
import HttpsProxyAgent from "https-proxy-agent";
import fs from "fs";

const maxRequests = 20;
const maxRequestWindowMS = 60000;

class TokenBucketRateLimiter {
  constructor({ maxRequests, maxRequestWindowMS }) {
    this.maxRequests = maxRequests;
    this.maxRequestWindowMS = maxRequestWindowMS;
    this.reset();
  }

  reset() {
    this.count = 0;
    this.resetTimeout = null;
  }

  scheduleReset() {
    if (!this.resetTimeout) {
      this.resetTimeout = setTimeout(
        () => this.reset(),
        this.maxRequestWindowMS
      );
    }
  }

  async acquireToken(fn) {
    if (this.count === this.maxRequests) {
      await nextTick();
      this.scheduleReset();
      await sleep(this.maxRequestWindowMS);
      return this.acquireToken(fn);
    }

    this.count = this.count + 1;
    await nextTick();
    return fn();
  }
}

const obj = JSON.parse(fs.readFileSync("./names.json", "utf8"));
const keys = obj.names;
let ids = [];
for (var i = 0; i < keys.length; i++) {
  ids.push(keys[i].email);
}

const proxyAgent = new HttpsProxyAgent(
  "http://uk-server-proxy-02.systems.uk.hsbc:80"
);

//the configuration api keey is kept in config.js
const payload = {
  iss: Config.APIKey,
  exp: new Date().getTime() + 5000,
};

//the token is generated after signing with the password kept in config.js
const token = jwt.sign(payload, Config.APISecret);
let type = "users";

//creatre a rotating logger
let log = bunyan.createLogger({
  name: "hsbc-zoom-compliance",
  serializers: bunyan.stdSerializers,
  streams: [
    {
      type: "rotating-file",
      path: "compliance.log",
      period: "1d", // daily rotation
      count: 3, // keep 3 back copies
      // `type: 'file'` is implied
    },
  ],
});

async function main() {
  const responses = await benchmarkParallelTokenBucket(ids.length);
  ids = [];

  for (let index = 0; index < responses.length; index++) {
    const element = responses[index];
    const payload = await element.json();

    for (let index = 0; index < payload.meetings.length; index++) {
      const element = payload.meetings[index];
      ids.push(element.id);
    }
  }

  type = "meetings";
  const meetings = await benchmarkParallelTokenBucket(ids.length);
}

async function callTheAPI(reqIndex, attempt = 0) {
  let url = `https://api.zoom.us/v2/report/users/${ids[reqIndex]}/meetings?from=${Config.from}&to=${Config.to}&type=past`;
  let isLog = false;
  if (type === "meetings") {
    url = `https://api.zoom.us/v2/metrics/meetings/${ids[reqIndex]}/participants?type=past`;
    isLog = true;
  }

  //get meta data for the meeting
  const response = await fetch(url, {
    agent: proxyAgent,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Zoom-api-Jwt-Request",
    },
  });
  if (isLog) logMeeting(response,ids[reqIndex]);
  return response;
}

async function logMeeting(response, meetingId) {
  //for (let index = 0; index < meetings.length; index++) {
  //const element = meetings[index];
  const payload = await response.json();

  for (let i = 0; i < payload.participants.length; i++) {
    if (!payload.participants[i].email) {
      payload.participants[i].email = "Unknown";
      payload.participants[i].participant_user_id = "0_0000-000000000000-00";
      payload.participants[i].id = "0_0000-000000000000-00";
    }
    const hoap = {
      meetingid: `${meetingId}`,
      id: `${payload.participants[i].id}`,
      user_id: `${payload.participants[i].user_id}`,
      email: `${payload.participants[i].email}`,
      participant_user_id: `${payload.participants[i].participant_user_id}`,
      network_type: `${payload.participants[i].network_type}`,
      device: `${payload.participants[i].device}`,
      ip_address: `${payload.participants[i].ip_address}`,
      share_application: `${payload.participants[i].share_application}`,
      share_desktop: `${payload.participants[i].share_desktop}`,
      share_whiteboard: `${payload.participants[i].share_whiteboard}`,
      recording: `${payload.participants[i].recording}`,
      role: `${payload.participants[i].role}`,
    };
    log.info(hoap);
  }
}

async function fetchAndRetryIfNecessary(callAPI, attempt = 0, index, url) {
  const response = await callTheAPI(index);

  //add error handling    
  // if (response.status === 429) {
  //   const retryAfter = response.headers.get('retry-after')
  //   const millisToSleep = getMillisToSleep(retryAfter)
  //   console.log('❗ Retrying:  ', index, `attempt:${attempt + 1}`, 'at', retryAfter, 'sleep for', millisToSleep, 'ms')
  //   await sleep(millisToSleep)
  //   return fetchAndRetryIfNecessary(callTheAPI, attempt + 1, index)
  // }
  return response;
}

async function benchmarkParallelTokenBucket(total) {
  const tokenBucket = new TokenBucketRateLimiter({
    maxRequests,
    maxRequestWindowMS,
  });
  const promises = getArrayOfLength(total).map(async (index) =>
    fetchAndRetryIfNecessary(
      async (attempt = 0) =>
        tokenBucket.acquireToken(() => callTheAPI(index, attempt)),
      0,
      index
    )
  );
  return Promise.all(promises);
}

function getArrayOfLength(length) {
  return Array.from(Array(length).keys());
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(err.stack || err.message);
    process.exit(1);
  });
