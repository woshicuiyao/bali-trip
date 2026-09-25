import { z } from 'zod';
import type { Trip, Mutation } from './model.ts';
const str=z.string().max(3000);const short=z.string().max(150);const time=z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/);
const endpoint=z.object({city:short.min(1),airport:short.min(1),terminal:short,date:z.string().regex(/^2026-\d{2}-\d{2}$/),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),timezone:z.enum(['Asia/Shanghai','Asia/Kuala_Lumpur','Asia/Makassar','Asia/Ho_Chi_Minh']),datetime:short.optional()}).strict();
const allowance=z.object({pieces:z.number().nonnegative().nullable(),weight_kg:z.number().nonnegative().nullable()});
const fields={
 events:z.object({title:short.min(1),dayId:short,time,endTime:time,type:short,notes:str,placeId:short,order:z.number().min(-10000).max(10000),optional:z.boolean(),status:short,flightId:short}).partial().strict(),
 stays:z.object({name:short.min(1),room:short,breakfast:short,price:short,phone:short,address:str,notes:str}).partial().strict(),
 flights:z.object({notes:str,person:z.enum(['sunto','Carson']),number:short.min(1),airline:short.min(1),direction:z.enum(['outbound','return']),departure:endpoint,arrival:endpoint,baggageNote:short,baggage:z.object({checked:allowance,carry_on:allowance}),duration:z.number().nonnegative(),status:short}).partial().strict(),
 tasks:z.object({title:short.min(1),notes:str,category:short,kind:z.enum(['todo','packing']),quantity:short,required:z.boolean(),due:z.string().regex(/^$|^2026-\d{2}-\d{2}$/),owners:z.array(z.enum(['sunto','Carson','共同'])).min(1).max(3),done:z.record(z.enum(['sunto','Carson','共同']),z.boolean())}).partial().strict(),
 bookings:z.object({title:short.min(1),date:z.string().regex(/^$|^2026-\d{2}-\d{2}$/),time,provider:short,contact:short,location:short,price:short,notes:str}).partial().strict(),
};
export const requestSchema=z.object({version:z.number().int().positive(),actor:z.enum(['sunto','Carson']),mutation:z.object({collection:z.enum(['events','stays','flights','tasks','bookings']),id:z.string().regex(/^[a-zA-Z0-9-]{1,90}$/),action:z.enum(['update','add','delete']),changes:z.record(z.unknown()).optional()}).strict()}).strict();
export function apply(data:Trip,m:Mutation){
 const list=data[m.collection];const index=list.findIndex(x=>x.id===m.id);
 if(m.action==='delete'){
  if(!['events','bookings','tasks','flights'].includes(m.collection)||index<0)throw Error('不能删除这条内容');
  const previous=list.splice(index,1)[0];if(m.collection==='flights')data.events=data.events.filter(e=>e.flightId!==m.id);return {previous,label:'删除'};
 }
 const changes:any=fields[m.collection].parse(m.changes||{});
 if(m.collection==='events' && 'dayId' in changes && !data.days.some(d=>d.id===changes.dayId))throw Error('请选择有效日期');
 if(m.action==='add'){
  if(!['events','bookings','tasks','flights'].includes(m.collection)||index>=0||(m.collection!=='flights'&&!changes.title))throw Error('新增内容不完整或已存在');
  if(list.length>=600)throw Error('当前条目较多，请先整理');
  if(m.collection==='events'&&!('dayId' in changes))throw Error('请选择日期');
  if(m.collection==='tasks'&&(!('owners' in changes)||!('kind' in changes)))throw Error('请选择清单与同行者');
  const defaults=m.collection==='events'?{time:'',endTime:'',notes:'',placeId:'',order:list.length,type:'sightseeing',optional:false,status:'计划',flightId:''}:m.collection==='tasks'?{done:{},quantity:'',notes:'',due:'',required:false,category:'其他'}:{time:'',date:'',notes:'',provider:'',contact:'',location:'',price:''};
  if(m.collection==='flights'){if(!changes.number||!changes.airline||!changes.person||!changes.departure||!changes.arrival)throw Error('请补齐航班号、同行者和起降信息');normalizeFlight(changes);}
  list.push({id:m.id,...(m.collection==='flights'?{direction:'outbound',notes:'',baggageNote:''}:defaults),...changes});if(m.collection==='flights')syncFlight(data,list[list.length-1]);return {previous:null,label:'新增'};
 }
 if(index<0)throw Error('这条内容已被移除');
 const previous={...list[index]};const next={...list[index],...changes};if(m.collection==='flights')normalizeFlight(next);list[index]=next;if(m.collection==='flights')syncFlight(data,next);return {previous,label:'修改'};
}

function normalizeFlight(f:any){
 for(const k of ['departure','arrival']){const end=f[k];if(!end)throw Error('请补齐起降信息');if(end.date<'2026-09-30'||end.date>'2026-10-08')throw Error('航班日期需在9月30日至10月8日之间');const offset=end.timezone==='Asia/Ho_Chi_Minh'?'+07:00':'+08:00';end.datetime=`${end.date}T${end.time}:00${offset}`;}
 f.duration=(Date.parse(f.arrival.datetime)-Date.parse(f.departure.datetime))/60000;if(!Number.isFinite(f.duration)||f.duration<=0)throw Error('抵达时间需晚于起飞时间，请检查日期和当地时区');
}
function syncFlight(data:Trip,f:any){
 const depDay=data.days.find(d=>d.date===f.departure.date),arrDay=data.days.find(d=>d.date===f.arrival.date);
 const existing=data.events.find(e=>e.flightId===f.id&&e.type==='flight');
 const notes=`${f.number} · ${f.person}；起降均为当地时间。${f.notes||''}`;
 const fields={dayId:depDay?.id,time:f.departure.time,endTime:f.arrival.time,title:`${f.departure.city}飞${f.arrival.city}`,notes};
 if(existing)Object.assign(existing,{...fields,notes:f.notes||existing.notes});else if(depDay)data.events.push({id:crypto.randomUUID(),...fields,type:'flight',placeId:'',order:data.events.filter(e=>e.dayId===depDay.id).length,optional:false,status:'已录入',flightId:f.id});
 const arrival=data.events.find(e=>e.flightId===f.id&&e.type==='arrival');
 const arr={dayId:arrDay?.id,time:f.arrival.time,endTime:'',title:`抵达${f.arrival.city} ${f.arrival.airport}`,notes};
 if(arrival)Object.assign(arrival,{...arr,notes:f.notes||arrival.notes});else if(arrDay&&arrDay.id!==depDay?.id)data.events.push({id:crypto.randomUUID(),...arr,type:'arrival',placeId:'',order:0,optional:false,status:'已录入',flightId:f.id});
}
