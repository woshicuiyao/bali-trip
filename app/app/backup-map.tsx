import {useEffect,useRef,useState} from 'react';
import {Map as MapLibre,Marker,Popup,NavigationControl,AttributionControl,addProtocol,setWorkerUrl,type GeoJSONSource,type LayerSpecification} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {Protocol} from 'pmtiles';
import {layers,namedFlavor} from '@protomaps/basemaps';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {Place} from '@/lib/places';
import {itinerarySegments} from '@/lib/map-itinerary';
setWorkerUrl(workerUrl);
const protocol=new Protocol();
addProtocol('pmtiles',protocol.tile);
type Props={points:Place[];selected:string;position:{lat:number;lng:number}|null;onSelect:(id:string)=>void;resetKey:number;overview:boolean};
/** Basemap, fonts, icons and worker all load from the same origin as the app. */
export default function BackupMap({points,selected,position,onSelect,resetKey,overview}:Props){
 const host=useRef<HTMLDivElement>(null),map=useRef<MapLibre|null>(null);
 const markers=useRef<Marker[]>([]),select=useRef(onSelect);select.current=onSelect;
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const pointsKey=points.map(p=>p.id).join(',');
 useEffect(()=>{
  if(!host.current)return;
  setReady(false);setError(false);
  const base=new URL(`${import.meta.env.BASE_URL}maps/`,location.origin).href;
  let m:MapLibre;
  try{m=new MapLibre({container:host.current,center:[115.24,-8.57],zoom:9.5,minZoom:8,maxZoom:18,
   maxBounds:[[114.38,-8.92],[115.78,-8.02]],renderWorldCopies:false,attributionControl:false,
   style:{version:8,glyphs:`${base}fonts/{fontstack}/{range}.pbf`,sprite:`${base}sprites/light`,
    sources:{bali:{type:'vector',url:`pmtiles://${base}bali-20260925.pmtiles`,attribution:'<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a> · <a href="https://protomaps.com">Protomaps</a>'}},
    layers:layers('bali',namedFlavor('light'),{lang:'en'}) as LayerSpecification[]},
  })}catch{setError(true);return;}
  map.current=m;
  m.addControl(new AttributionControl({compact:false}),'bottom-right');
  m.addControl(new NavigationControl({showCompass:false}),'bottom-right');
  const timeout=setTimeout(()=>setError(true),20000);
  m.on('load',()=>{clearTimeout(timeout);setReady(true);setError(false)});
  m.on('error',()=>setError(true));
  m.on('idle',()=>{if(m.areTilesLoaded()){setReady(true);setError(false);clearTimeout(timeout)}});
  const resize=new ResizeObserver(()=>m.resize());resize.observe(host.current);
  return()=>{clearTimeout(timeout);resize.disconnect();markers.current.forEach(marker=>marker.remove());markers.current=[];map.current=null;m.remove()};
 },[retry]);
 useEffect(()=>{
  const m=map.current;if(!m)return;
  markers.current.forEach(marker=>marker.remove());markers.current=[];
  const unique=[...new globalThis.Map(points.map(p=>[p.id,p])).values()];
  unique.forEach((p,i)=>{
   const button=document.createElement('button');button.type='button';button.className='detail-map-marker';
   button.setAttribute('aria-label',p.name);button.setAttribute('aria-pressed',String(selected===p.id));
   const pin=document.createElement('span');pin.className=`backup-pin${selected===p.id?' is-selected':''}`;pin.textContent=overview?(p.kind==='住宿'?'宿':'●'):String(i+1);button.append(pin);
   if((overview&&p.kind==='住宿')||selected===p.id){const label=document.createElement('span');label.className='detail-map-label';label.textContent=p.name;button.append(label)}
   button.onclick=()=>select.current(p.id);
   markers.current.push(new Marker({element:button,anchor:'center'}).setLngLat([p.lng,p.lat]).addTo(m));
  });
  if(ready){
   const data={type:'FeatureCollection' as const,features:itinerarySegments(points,overview)};
   const source=m.getSource('itinerary-order') as GeoJSONSource|undefined;
   if(source)source.setData(data);
   else{m.addSource('itinerary-order',{type:'geojson',data});m.addLayer({id:'itinerary-order',type:'line',source:'itinerary-order',paint:{'line-color':'#10aee0','line-width':2,'line-opacity':.7,'line-dasharray':[2,3]}})}
  }
  const focus=unique.find(p=>p.id===selected);
  const padding={top:195,bottom:90,left:38,right:38};
  if(position){const dot=document.createElement('span');dot.className='detail-location';markers.current.push(new Marker({element:dot}).setLngLat([position.lng,position.lat]).setPopup(new Popup().setText('我的位置')).addTo(m));m.easeTo({center:[position.lng,position.lat],zoom:15,padding})}
  else if(focus)m.easeTo({center:[focus.lng,focus.lat],zoom:15,padding,duration:350});
  else if(unique.length)m.fitBounds([[Math.min(...unique.map(p=>p.lng)),Math.min(...unique.map(p=>p.lat))],[Math.max(...unique.map(p=>p.lng)),Math.max(...unique.map(p=>p.lat))]],{padding,maxZoom:14,duration:0});
 },[pointsKey,selected,position?.lat,position?.lng,resetKey,ready,retry,overview]);
 return <><div ref={host} className="backup-map" aria-label="巴厘岛详细行程地图"/>
  {!ready&&!error&&<div className="detail-map-status" role="status">正在加载道路和地名…</div>}
  {error&&<div className="detail-map-status" role="status">详细地图加载未完成 <button onClick={()=>setRetry(n=>n+1)}>重试</button></div>}
  <div className="backup-map-caption">{overview?'全程地点 · 双指缩放查看街道':'虚线为行程顺序 · 非道路导航'}</div></>;
}
