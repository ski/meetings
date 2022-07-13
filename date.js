const l = new Date("2002-06-24T08:03:25Z").getTime();
const j = new Date("2002-06-24T07:31:52Z").getTime();



Math.abs(l-j);
const msInMinute =   60 * 1000;

console.log(Math.round(Math.abs(l-j)/msInMinute));