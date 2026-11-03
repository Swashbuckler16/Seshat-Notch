import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  const context=await browser.newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Kolkata'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-11-03T10:00:00+05:30'));
  await page.addInitScript(()=>localStorage.setItem('seshat_onboarding_completed','true'));
  await page.goto('http://127.0.0.1:5175/');
  await page.getByRole('navigation').waitFor();
  const counts=await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('seshat_notch_db');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const dates=[];for(let d=new Date('2023-11-04T12:00:00Z');d<=new Date('2026-11-03T12:00:00Z');d.setUTCDate(d.getUTCDate()+1))dates.push(d.toISOString().slice(0,10));
    const now=new Date().toISOString();
    const activities=Array.from({length:40},(_,i)=>({id:`scale-${i}`,title:`Activity ${i+1}`,areaId:'scale',kind:'yes_no',metricType:'boolean',scheduleType:'daily',targetValue:1,startDate:dates[0],isArchived:false,isDeleted:false,createdAt:now,updatedAt:now}));
    const entries=activities.flatMap(a=>dates.filter((_,i)=>i%3).map(date=>({id:`${a.id}-${date}`,entityId:a.id,entityType:'habit',date,value:1,isDeleted:false,timestamp:now,createdAt:now,unit:'count'})));
    await new Promise((resolve,reject)=>{const transaction=db.transaction(['areas','habits','progressLogs'],'readwrite');transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.objectStore('areas').put({id:'scale',name:'Scale test',order:0,isArchived:false,createdAt:now,updatedAt:now});for(const a of activities)transaction.objectStore('habits').put(a);for(const e of entries)transaction.objectStore('progressLogs').put(e);});
    db.close();return {activities:activities.length,entries:entries.length};
  });
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();
  await page.locator('.activity-row').first().waitFor();
  const routes=[];
  for(const name of ['Activities','Analytics','Today']) {
    const start=performance.now();
    await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
    await page.locator(name==='Analytics'?'.analytics-summary':'.activity-row').first().waitFor();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    routes.push({screen:name,elapsedMs:Math.round(performance.now()-start)});
  }
  await context.setOffline(true);
  await page.reload();
  await page.locator('.activity-row').first().waitFor();
  await page.getByRole('navigation').getByRole('button',{name:'Analytics',exact:true}).click();
  await page.locator('.analytics-summary').waitFor();
  const report={...counts,routes,offlineReload:true,offlineAnalytics:true,errors,note:'Production preview. Isolated Chrome context; timings include click dispatch and two frames. Cached Today and Analytics verified offline.'};
  fs.writeFileSync('docs/production-results.json',JSON.stringify(report,null,2));console.log(report);
  if(errors.length)process.exitCode=1;
} finally {await browser.close();}
