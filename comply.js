const axios = require("axios").default;
const config = require("./config");
const jwt = require("jsonwebtoken");
const bunyan = require("bunyan");

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
  iss: config.APIKey,
  exp: new Date().getTime() + 5000,
};
//the token is generated after signing with the password kept in config.js
token = jwt.sign(payload, config.APISecret);

//create a reusable axios connection with the token generated above.
const connection = axios.create({
  baseURL: "https://api.zoom.us/v2/",
  timeout: 5000,
  headers: {
    Authorization: `Bearer ${token}`,
    "User-Agent": "Zoom-api-Jwt-Request",
    "content-type": "application/json",
  },
});

//TODO: change this. currently only one user report will be generated. The full
//TODO: solution will have the feature to read the user either from a file or
//TODO: from an HR data feed.
const testEmail = "suhailski@gmail.com";

//TODO: read the users from file or HR data feed.
const user = encodeURIComponent(testEmail);
//TODO parameterise the from and to query strings.
const meetingsForUserurl = `/report/users/${user}/meetings?from=2022-01-30&to=2022-02-16&type=past`;

//this is a self invoking expression so that asynchronous axion invocations can be made
(async () => {
  //get all meetings for a user
  let res = await connection.get(meetingsForUserurl, {
    proxy: {
      host: "uk-server-proxy-02.systems.uk.hsbc",
      port: 80,
    },
  });
  const meetings = res.data.meetings;
  //this should return 0 or more meetings in the time period.
  for (let i = 0; i < meetings.length; i++) {
    const meetingId = meetings[i].id;
    //construct meeting url
    let meetingUrl = `https://api.zoom.us/v2/metrics/meetings/${meetingId}?type=past`;
    //get meta data for the meeting
    res = await connection.get(meetingUrl, {
      proxy: {
        host: "uk-server-proxy-02.systems.uk.hsbc",
        port: 80,
      },
    });
    //add the participant email to the data
    const data = {
      participant_email: testEmail,
      ...res.data,
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
})().catch((err) => {
  console.error(err);
});
