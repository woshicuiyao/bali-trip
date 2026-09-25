'use client';
import {useEffect,useState,useRef} from 'react';
import {createPortal} from 'react-dom';
import {LocateFixed,Expand,ExternalLink,RefreshCw,Navigation,Ship,MapPin} from 'lucide-react';
import {placeById,type Place} from '@/lib/places';
import {googleEmbedUrl,googleMapsUrl,islandOf,mapLegs} from '@/lib/google-maps';

export default function TravelMap({ids,selected,onSelect,placesHost}:{ids:string[];selected:string;onSelect:(id:string)=>void;placesHost:HTMLDivElement|null}){
 const [legIndex,setLegIndex]=useState(0),[position,setPosition]=useState<{lat:number;lng:number}|null>(null),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0),[locating,setLocating]=useState(false);
 const loadTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 function finishLoad(){if(loadTimer.current)clearTimeout(loadTimer.current);setLoading(false)}
 const key=ids.join(',');
 const points=ids.map(placeById).filter((p):p is Place=>!!p);
 const legs=mapLegs(points);const active=legs[Math.min(legIndex,Math.max(0,legs.length-1))];
 const focus=selected?placeById(selected):undefined;
 const shown=focus?[focus]:active?.points||[];
 const src=googleEmbedUrl(shown,position);
 const crossesSea=new Set(points.map(islandOf)).size>1;
 const external=position?`https://www.google.com/maps/search/?api=1&query=${position.lat}%2C${position.lng}`:googleMapsUrl(shown);
 useEffect(()=>{setLegIndex(0);setPosition(null);setMessage('')},[key]);
 useEffect(()=>{setPosition(null);setMessage('')},[selected]);
 useEffect(()=>{setLoading(true);loadTimer.current=setTimeout(()=>{setLoading(false);setMessage('地图未显示时，可在 Google 地图中打开。')},12000);return()=>{if(loadTimer.current)clearTimeout(loadTimer.current)}},[src,attempt]);
 function overview(){onSelect('');setPosition(null);setLegIndex(0);setMessage('');}
 function locate(){
  if(!navigator.geolocation){setMessage('当前浏览器不支持定位');return;}
  setLocating(true);setMessage('正在获取位置…');
  navigator.geolocation.getCurrentPosition(p=>{setLocating(false);const {latitude:lat,longitude:lng}=p.coords;if(lat< -9.15||lat> -7.85||lng<114.3||lng>116){setMessage('你目前不在巴厘岛范围内，地图保持行程区域');return;}setPosition({lat,lng});setMessage('当前位置 · 不与同行者共享')},()=>{setLocating(false);setMessage('未获取到位置，请检查浏览器定位权限')},{timeout:12000,maximumAge:0,enableHighAccuracy:false});
 }
 return <div className="google-map-region">
  <div className="google-map-toolbar">
   <div className="map-leg-tabs" aria-label="地图路线分段">{legs.length>1?legs.map((l,i)=><button key={i} aria-pressed={!focus&&!position&&i===legIndex} onClick={()=>{onSelect('');setPosition(null);setLegIndex(i);setMessage('')}}>{l.label}</button>):<span>{focus?focus.name:active?.label||'巴厘岛'}</span>}</div>
   <button className="map-tool" aria-label="显示我的位置" disabled={locating} onClick={locate}><LocateFixed size={17}/></button>
   <button className="map-tool" aria-label="查看行程路线" onClick={overview}><Expand size={17}/></button>
   <a className="map-tool map-provider-link" href={external} target="_blank" rel="noreferrer" aria-label="在 Google 地图打开" title="在 Google 地图打开"><ExternalLink size={14}/><span>Google</span></a>
   {focus&&<a className="map-tool" href={googleMapsUrl([focus],true)} target="_blank" rel="noreferrer" aria-label="使用 Google 地图导航" title="使用 Google 地图导航"><Navigation size={17}/></a>}
  </div>
  <div className="google-map-stage">
   <iframe key={`${src}-${attempt}`} src={src} title={position?'Google 地图 · 我的位置':focus?`Google 地图 · ${focus.name}`:'Google 地图 · 巴厘岛行程'} referrerPolicy="no-referrer" allow="geolocation 'none'" allowFullScreen onLoad={finishLoad} onError={()=>{finishLoad();setMessage('地图暂时无法加载，可在 Google 地图中打开。')}}/>
   {loading&&<div className="google-map-loading" role="status"><RefreshCw className="spin" size={16}/>正在加载 Google 地图</div>}
  </div>
  {placesHost&&points.length>0&&createPortal(<section className="itinerary-places" aria-label="行程地点">
   <div className="itinerary-places-heading"><span><MapPin size={13}/>行程地点</span><small>{crossesSea?<><Ship size={12}/>跨海船程单独安排</>:'点击地点查看地图'}</small></div>
   <div className="map-place-chips">{[...new Map(points.map(p=>[p.id,p])).values()].map(p=><button key={p.id} aria-pressed={selected===p.id&&!position} onClick={()=>{setPosition(null);onSelect(p.id)}}>{p.name}</button>)}</div>
  </section>,placesHost)}
  {message&&<div className="google-map-message" role="status"><span>{message}</span><button aria-label="重新加载 Google 地图" onClick={()=>{setAttempt(a=>a+1);setMessage('')}}><RefreshCw size={14}/></button><button aria-label="关闭地图提示" onClick={()=>setMessage('')}>×</button></div>}
 </div>;
}
