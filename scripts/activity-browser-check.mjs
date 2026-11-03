import { createRequire } from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
let chromium;
try { ({chromium}=require('playwright')); } catch { ({chromium}=require('C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const {default:AxeBuilder}=await import('@axe-core/playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Kolkata'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.clock.setFixedTime(new Date('2026-11-03T10:00:00+05:30'));
await page.addInitScript(()=>{localStorage.setItem('seshat_onboarding_completed','true');localStorage.setItem('seshat_daily_backup_prompt_enabled','false');});
await page.goto('http://127.0.0.1:5174/');
await page.waitForTimeout(800);
const sample=await page.evaluate(async()=>{
  const {db}=await import('/src/db/index.ts');const {activityService}=await import('/src/services/activityService.ts');const {getActivityStats,dateRange}=await import('/src/utils/activityMath.ts');
  const now=new Date().toISOString();await db.areas.put({id:'health-test',name:'Health and personal development',order:0,isArchived:false,createdAt:now,updatedAt:now});
  const sleep=await activityService.save({title:'Sleep cycle',areaId:'health-test',kind:'time_window',icon:'moon',accent:1,startDate:'2026-10-01',timeWindow:{start:'22:00',end:'06:00',crossesMidnight:true}});
  for(const date of dateRange('2026-10-01','2026-11-02'))if(!['2026-10-07','2026-10-13','2026-10-21','2026-10-25'].includes(date))await activityService.setEntry(sleep.id,date,{value:1},'2026-11-03');
  return {id:sleep.id,stats:getActivityStats(sleep,await db.progressLogs.toArray(),'2026-11-03')};
});
if(sample.stats.done!==29||sample.stats.scheduled!==33||sample.stats.currentStreak!==8)throw Error('Sleep sample mismatch');
await page.getByRole('button',{name:'Mark done: Sleep cycle',exact:true}).click();
await page.getByRole('button',{name:'Undo',exact:true}).click();
await page.waitForTimeout(150);
await page.evaluate(async()=>{const {db}=await import('/src/db/index.ts');const {activityService}=await import('/src/services/activityService.ts');for(const [title,kind,targetValue,unit,icon,accent] of [['Drink water','count',8,'glasses','water',0],['Read a little','yes_no',1,'','book',3]]){const a=await activityService.save({title,kind,targetValue,unit,icon,accent,areaId:'health-test',startDate:'2026-10-01'});await activityService.setEntry(a.id,'2026-11-03',{value:kind==='count'?4:1},'2026-11-03');}});
await page.getByRole('button',{name:'Add progress to Drink water',exact:true}).click();
await page.getByRole('button',{name:'Set to 8',exact:true}).click();await page.getByRole('button',{name:'Save entry',exact:true}).click();
await page.waitForTimeout(200);
fs.mkdirSync('docs/screenshots',{recursive:true});
const checks=[];
for(const width of [1440,900,375]) {
  await page.setViewportSize({width,height:width===900?640:900});
  for(const screen of ['Today','Activities','Analytics','Plan','Settings']) {
    await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:screen,exact:true}).click();await page.waitForTimeout(300);
    for(const [palette,mode] of [['seshat','light'],['seshat','dark'],['ocean','light'],['berry','light']]) {
      await page.evaluate(([palette,mode])=>{document.documentElement.dataset.palette=palette;document.documentElement.dataset.mode=mode;},[palette,mode]);
      await page.waitForTimeout(350); const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      checks.push({width,screen,palette,mode,violations:result.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
      if(width===1440&&palette==='seshat'&&mode==='light'&&['Today','Activities','Analytics'].includes(screen)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`docs/screenshots/${screen.toLowerCase()}.png`,fullPage:true});}
    }
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)errors.push(`Overflow ${screen} ${width}`);
  }
}
fs.writeFileSync('docs/browser-results.json',JSON.stringify({sample:{done:sample.stats.done,scheduled:sample.stats.scheduled,streak:sample.stats.currentStreak},checks,errors},null,2));
console.log(JSON.stringify({checks:checks.length,violations:checks.filter(c=>c.violations.length),errors},null,2));
await browser.close();

