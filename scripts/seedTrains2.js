require('dotenv').config({ path: '../.env' });
const m=require('mysql2/promise');
(async()=>{
  const p=await m.createPool({host:'localhost',user:'root',password:'',database:'railway_management'});
  const today='2026-03-15';
  const routes=[
    ['TRN10001','Mumbai','Delhi','06:00',16],
    ['TRN10002','Mumbai','Delhi','08:00',16],
    ['TRN10003','Pune','Mumbai','06:00',3],
    ['TRN10004','Delhi','Kolkata','07:00',17],
    ['TRN10005','Bangalore','Chennai','08:00',5],
    ['TRN10006','Mumbai','Hyderabad','09:00',10],
    ['TRN10007','Delhi','Ahmedabad','07:00',12],
    ['TRN10008','Hyderabad','Bangalore','08:00',8],
  ];
  try {
    for(const [num,src,dst,dep,hrs] of routes){
      const arr=new Date('2026-03-15T'+dep);
      arr.setHours(arr.getHours()+hrs);
      const arrStr=arr.toTimeString().slice(0,8);
      const [r]=await p.query('INSERT IGNORE INTO trains (train_number,source,destination,departure_time,arrival_time) VALUES (?,?,?,?,?)',
        [num,src,dst,today+' '+dep,today+' '+arrStr]);
      if(r.insertId){
        for(let i=1;i<=50;i++){
          const cls=i<=25?'SL':i<=40?'3A':i<=47?'2A':'1A';
          await p.query('INSERT INTO seats (train_id,seat_number,class,is_available) VALUES (?,?,?,TRUE)',[r.insertId,'S'+i,cls]);
        }
        console.log('Added:',num,src,'->',dst);
      } else {
        console.log('Skipped duplicate:',num);
      }
    }
  } catch (err) {
    console.error(err);
  }
  console.log('Done!');
  process.exit();
})();
