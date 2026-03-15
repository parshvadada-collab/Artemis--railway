const m=require('mysql2/promise');
(async()=>{
  const p=await m.createPool({host:'127.0.0.1',user:'root',password:'',database:'railway_management'});
  const [r]=await p.query("SELECT pnr_code FROM bookings WHERE status='waitlisted' LIMIT 1");
  console.log(r[0].pnr_code);
  process.exit();
})();
