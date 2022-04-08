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
        path: "allmeetings.log",
        period: "1d", // daily rotation
        count: 3, // keep 3 back copies
        // `type: 'file'` is implied
      },
    ],
  });

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

      let usersUrl = new URL("https://api.zoom.us/v2/users");
      
      let next_page_token = '';
      let params = {
        page_size: '1',
        // to: '2022-02-16',
        // from: '2022-01-30',
        // type: 'past',
        // next_page_token : ''
      };
      do {
       
          Object.keys(params).forEach(key => usersUrl.searchParams.append(key, params[key]));
          let response = await fetch(usersUrl, {
            //agent: proxyAgent,
            method: "get",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "User-Agent": "Zoom-api-Jwt-Request",
            },
          });

          const data = await response.json();
          next_page_token = data.next_page_token;
          params = {
            page_size: '1',
            // to: '2022-02-16',
            // from: '2022-01-30',
            // type: 'past',
            next_page_token : data.next_page_token
          };
          console.log(data);
      } while (next_page_token != '');


  })().catch((err) => {
    console.error(err);
  });  