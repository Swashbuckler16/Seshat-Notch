import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:900},timezoneId:'Asia/Kolkata'});
await page.clock.setFixedTime(new Date('2026-11-03T10:00:00+05:30'));
await page.addInitScript(()=>localStorage.setItem('seshat_onboarding_completed','true'));
await page.goto('http://127.0.0.1:5174/');
const data=await page.evaluate(async()=>{
  const {db}=await import('/src/db/index.ts');const {dateRange,getOverviewStats}=await import('/src/utils/activityMath.ts');
  const now=new Date().toISOString();const dates=dateRange('2023-11-04','2026-11-03');
  await db.areas.put({id:'scale',name:'Scale test',order:0,isArchived:false,createdAt:now,updatedAt:now});
  const activities=Array.from({length:40},(_,i)=>({id:`scale-${i}`,title:`Activity ${i+1}`,areaId:'scale',kind:'yes_no',metricType:'boolean',scheduleType:'daily',targetValue:1,startDate:dates[0],isArchived:false,isDeleted:false,createdAt:now,updatedAt:now}));
  const entries=activities.flatMap(a=>dates.filter((_,i)=>i%3).map(date=>({id:`${a.id}-${date}`,entityId:a.id,entityType:'habit',date,value:1,isDeleted:false,timestamp:now,createdAt:now,unit:'count'})));
  await db.transaction('rw',db.habits,db.progressLogs,async()=>{await db.habits.bulkPut(activities);await db.progressLogs.bulkPut(entries);});
  const start=performance.now();getOverviewStats(activities,entries,'2026-11-03','2023-11-04');
  return {activities:40,entries:entries.length,mathMs:performance.now()-start};
});
await page.waitForTimeout(1200);
const results=[];
for(const name of ['Activities','Analytics','Today']) {
  const start=performance.now();await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
  await page.locator(name==='Analytics'?'.analytics-summary':'.activity-row').first().waitFor();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  results.push({screen:name,elapsedMs:Math.round(performance.now()-start)});
}
const report={...data,results,note:'Cold route switch on Vite development server, including Playwright click dispatch and two animation frames. Isolated browser context; no personal data.'};
fs.writeFileSync('docs/performance-results.json',JSON.stringify(report,null,2));console.log(report);await browser.close();
