import { stringify } from "csv-stringify";
import fs from "fs";
const filename = "saved_from_db.csv";
const writableStream = fs.createWriteStream(filename);

const columns = [
    "NAME",
    "LANGUAGE",
  ];
  
const stringifier = stringify({ header: true, columns: columns });

const records = [
  {name: 'Bob',  lang: 'French'},
  {name: 'Mary', lang: 'English'}
];

(function () {
  records.forEach(logRecord);

  async function logRecord(row) {
   stringifier.write([row.name, row.lang]);
  }

  stringifier.pipe(writableStream);
console.log("Finished writing data");
})();