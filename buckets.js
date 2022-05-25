import stopcock from "stopcock";
import fetch from "node-fetch";
import { Config } from "./config.js";
import jwt from "jsonwebtoken";
import bunyan from "bunyan";
import HttpsProxyAgent from "https-proxy-agent";
import fs from "fs";


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

//the configuration api keey is kept in config.js
const payload = {
  iss: Config.APIKey,
  exp: new Date().getTime() + 5000,
};

//the token is generated after signing with the password kept in config.js
const token = jwt.sign(payload, Config.APISecret);

async function request(i, endpoint) {
  const response =  fetch(endpoint, {
    agent: proxyAgent,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Zoom-api-Jwt-Request",
    },
  });
  return Promise.resolve(response);
}


const get = stopcock(request, { bucketSize: 5,limit: 1, interval:2000  });

const obj = JSON.parse(fs.readFileSync("./names.json", "utf8"));
const keys = obj.names;
let ids = [];
for (let i = 0; i < keys.length; i++) {
  ids.push(keys[i].email);
}

const makeLogEntry = ({email: email, meeting: meeting, participant: participant}) => {
  
  const hoap = {
    meetingid: `${meeting.id}`,
    id: `${participant.id}`,
    user_id: `${participant.user_id}`,
    user_name: `${participant.user_name}`,
    email: `${email}`,
    participant_user_id: `${participant.participant_user_id}`,
    topic: `${meeting.topic}`,
    start_time: `${meeting.start_time}`,
    end_time: `${meeting.end_time}`,
    duration: `${meeting.duration}`,
    participants: `${meeting.participants}`,
    has_pstn: `${meeting.has_pstn}`,        
    has_voip: `${meeting.has_voip}`,
    has_3rd_party_audio: `${meeting.has_3rd_party_audio}`,
    has_video: `${meeting.has_video}`,
    has_screen_share: `${meeting.has_screen_share}`,
    has_recording: `${meeting.has_recording}`,
    has_sip: `${meeting.has_sip}`,
    network_type: `${participant.network_type}`,
    device: `${participant.device}`,
    ip_address: `${participant.ip_address}`,
    share_application: `${participant.share_application}`,
    share_desktop: `${participant.share_desktop}`,
    share_whiteboard: `${participant.share_whiteboard}`,
    recording: `${participant.recording}`,
    role: `${participant.role}`,
  };
  log.info(hoap);
}
(async function() {
  for (let i = 0; i < ids.length; i++) { 
    const meetingUrl = `https://api.zoom.us/v2/report/users/${ids[i]}/meetings?from=${Config.from}&to=${Config.to}&type=past`;
    let response = await get(i, meetingUrl)
    let payload = await response.json();
    if (payload.meetings !== undefined) {      
      try {
        for (let i = 0; i < payload.meetings.length; i++) {     
          //first get meeting metadata
          const meetingurl = `https://api.zoom.us/v2/metrics/meetings/${payload.meetings[i].id}?type=past`; 
          response = await get(i, meetingurl)
          const meeting = await response.json();                    

          const participantsUrl = `https://api.zoom.us/v2/metrics/meetings/${payload.meetings[i].id}/participants?type=past`;
          response = await get(i, participantsUrl)
          
          const data = await response.json();                    
          if (!data.participants || !payload.meetings[i]) continue;  

          for (let j = 0; j < data.participants.length; j++) {
            if (!data.participants[j].email) {
              data.participants[j].email = "External";
              data.participants[j].participant_user_id = "0_0000-000000000000-00";
              data.participants[j].id = "0_0000-000000000000-00";
              data.participants[j].ip_address = "0.0.0.0"
            }
            makeLogEntry({email:data.participants[j].email, meeting:meeting, participant:data.participants[j]});
          }
        }   
      } catch (error) {
        console.log(error);
        break;
      }        
    }
  }
})()


