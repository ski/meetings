import fs from 'fs';
import readline from 'readline'



function process() {
    const columns = [
        "MEETINGID",
        "MEETINGUID",
        "PARTICIPANTID",
        "USERNAME",
        "EMAIL",
        "PARTICIPANTUSERID",
        "TOPIC",
        "STARTTIME",
        "ENDTIME",
        "DURATION",
        "PARTICIPANTS",
        "HASPSTN",
        "HASVOIP",
        "HASTHIRDPARTYAUDIO",
        "HASVIDEO",
        "HASSCREENSHARE",
        "HASRECORDING",
        "HASSIP",
        "NETWORKTYPE",
        "DEVICE",
        "IPADDRESS",
        "SHAREDESKTOP",
        "SHAREAPPLICATION",
        "SHAREWHITEBOARD",
        "RECORDING",
        "ROLE"
      ];
        
    const writeStream = fs.createWriteStream('compliance.csv');
    writeStream.write(columns.join(",") + '\n');
    const readStream = fs.createReadStream('compliance.log', 'utf-8');
    let rl = readline.createInterface({input: readStream})
    rl.on('line', (line) => {
        const data = JSON.parse(line);
        const row = [data['meetingid'],data['id'],data['user_id'],data['user_name'],
        data['email'], data['participant_user_id'],data['topic'].replace(/,/g, " "),data['start_time'],
        data['end_time'], data['duration'], data['participants'], data['has_pstn'],
        data['has_voip'], data['has_3rd_party_audio'], data['has_video'], data['has_screen_share'],
        data['has_recording'], data['has_sip'], data['network_type'], data['device'],
        data['ip_address'], data['share_desktop'], data['share_application'], data['share_whiteboard'],
        data['recording'], data['role']];
        
        writeStream.write(row.join(",") + '\n');
    }).on('close', () => {
        writeStream.end();
        writeStream.on('finish', () => {
            console.log('Data processing completed');
        })
    });
 };
 process(); 