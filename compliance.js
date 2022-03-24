import fetch from "node-fetch";
import { Config } from "./config.js";
import jwt from "jsonwebtoken";
import bunyan from "bunyan";
import HttpsProxyAgent from "https-proxy-agent";
import fs from "fs";


//creatre a rotating logger
var log = bunyan.createLogger({
  name: "hsbc-zoom-compliance",
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

//the configuration api keey is kept in config.js
let payload = {
  iss: Config.APIKey,
  exp: new Date().getTime() + 5000,
};

//the token is generated after signing with the password kept in config.js
const token = jwt.sign(payload, Config.APISecret);

(async () => {
  const proxyAgent = new HttpsProxyAgent({hostname:'46.250.171.31', port:8080, rejectUnauthorized:false});
  //TODO: change this. currently only one user report will be generated. The full
  //TODO: solution will have the feature to read the user either from a file or
  //TODO: from an HR data feed.
  fs.readFile(
    "names.json",
    // callback function that is called when reading file is done
    function (err, data) {
      // json data
      let jsonData = data;
      // parse json
      const json = JSON.parse(jsonData);
      // console.log(jsonParsed);
      json.names.forEach(async function (value) {
        const meetingForUserURL = `https://api.zoom.us/v2/report/users/${value.email}/meetings?from=2022-01-30&to=2022-02-16&type=past`;
        let response = await fetch(meetingForUserURL, {
          //agent: proxyAgent,
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "Zoom-api-Jwt-Request",
          },
        });

        const data = await response.json();
        const meetings = data.meetings;

        if (meetings) {
          //this should return 0 or more meetings in the time period.
          for (let i = 0; i < meetings.length; i++) {
            const meetingId = meetings[i].id;
            //construct meeting url
            let meetingUrl = `https://api.zoom.us/v2/metrics/meetings/${meetingId}?type=past`;
            //get meta data for the meeting
            const response = await fetch(meetingUrl, {
              //agent: proxyAgent,
              method: "get",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "User-Agent": "Zoom-api-Jwt-Request",
              },
            });

            const payload = await response.json();
            //add the participant email to the data
            const data = {
              participant_email: value.email,
              ...payload,
            };

            //TODO: need to figure out how to fetch only needs feilds from Zoom
            //delete unwanted feilds.
            delete data.topic;
            delete data.host;
            delete data.duration;
            delete data.has_archiving;
            delete data.has_recording;
            delete data.department;
            //log the data to the log file as json so that elastic search can injest it.
            log.info(data);
          }
        }
      });
    }
  );

  //this should return 0 or more meetings in the time period.
})().catch((err) => {
  console.error(err);
});
