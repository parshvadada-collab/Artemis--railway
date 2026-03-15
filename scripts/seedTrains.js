const m = require('mysql2/promise');
(async () => {
  const p = await m.createPool({host:'localhost',user:'root',password:'',database:'railway_management'});
  const today = '2026-03-15';
  const tomorrow = '2026-03-16';
  const routes = [
    ['12951','Mumbai','Delhi', today + ' 08:00:00', tomorrow + ' 01:30:00'],
    ['11077','Pune','Mumbai', today + ' 06:15:00', today + ' 09:45:00'],
    ['12163','Chennai','Bangalore', today + ' 07:00:00', today + ' 12:30:00'],
    ['12951','Delhi','Kolkata', today + ' 09:00:00', tomorrow + ' 03:00:00'],
  ];
  try {
    for(const [num,src,dst,dep,arr] of routes){
      const [r] = await p.query('INSERT INTO trains (train_number,source,destination,departure_time,arrival_time) VALUES (?,?,?,?,?)',
        [num,src,dst,dep,arr]);
      for(let i=1;i<=50;i++){
        await p.query('INSERT INTO seats (train_id,seat_number,class,is_available) VALUES (?,?,?,TRUE)',
          [r.insertId,'S'+i,i<=20?'SL':i<=35?'3A':i<=45?'2A':'1A']);
      }
      console.log('Added train',num,src,'->',dst);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit();
})();
