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
  const proxyAgent = new HttpsProxyAgent(
    "http://uk-server-proxy-02.systems.uk.hsbc:80"
  );
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

      json.names.forEach(async function (value) {
        const meetingForUserURL = `https://api.zoom.us/v2/report/users/${value.email}/meetings?from=2022-01-30&to=2022-02-16&type=past`;
        let response = await fetch(meetingForUserURL, {
          agent: proxyAgent,
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
            let meetingUrl = `https://api.zoom.us/v2/metrics/meetings/${meetingId}/participants?type=past`;

            //get meta data for the meeting
            const response = await fetch(meetingUrl, {
              agent: proxyAgent,
              method: "get",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "User-Agent": "Zoom-api-Jwt-Request",
              },
            });

            const payload = await response.json();

            //TODO: need to figure out how to fetch only needs feilds from Zoom

            for (let i = 0; i < payload.participants.length; i++) {
              delete payload.participants[i].internal_ip_addresses;
              delete payload.participants[i].data_center;
              delete payload.participants[i].full_data_center;
              delete payload.participants[i].connection_type;
              delete payload.participants[i].join_time;
              delete payload.participants[i].leave_time;
              delete payload.participants[i].pc_name;
              delete payload.participants[i].domain;
              delete payload.participants[i].mac_addr;
              delete payload.participants[i].harddisk_id;
              delete payload.participants[i].version;
              delete payload.participants[i].leave_reason;
              delete payload.participants[i].registrant_id;
              delete payload.participants[i].status;
              delete payload.participants[i].customer_key;
              delete payload.participants[i].sip_uri;
              delete payload.participants[i].from_sip_uri;
              delete payload.participants[i].location;  
              delete payload.participants[i].camera  
              delete payload.participants[i].microphone
              delete payload.participants[i].speaker  
              delete payload.participants[i].camera     
              delete payload.participants[i].user_name

              if(!payload.participants[i].email) {
                payload.participants[i].email = 'external';
                payload.participants[i].participant_user_id = 'external';
              }
              log.info(payload.participants[i]);            
            }
          }
        }
      });
    }
  );

  //this should return 0 or more meetings in the time period.
})().catch((err) => {
  console.error(err);
});
