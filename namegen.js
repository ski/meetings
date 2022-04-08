import fs from 'fs';
import csv from 'csv-parser';

const names = [];
fs.createReadStream('./data.csv')
.pipe(csv())
.on('data', function(data){
    try {       
        names.push(data);
    }
    catch(err) {
        //error handler
    }
})
.on('end',function(){
    const gen = {}
   
    gen.names = names;
    //console.log(gen);
    try {
        fs.writeFileSync('./names.json', JSON.stringify(gen))
      } catch (err) {
        console.error(err)
      }
    //perform the operation
});  