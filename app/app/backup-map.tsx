import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import type {GeoJsonObject} from 'geojson';
import 'leaflet/dist/leaflet.css';
import coastline from '@/lib/bali-coastline.json';
import type {Place} from '@/lib/places';

type Props={points:Place[];selected:string;position:{lat:number;lng:number}|null;onSelect:(id:string)=>void;resetKey:number};

/** The bundled coastline and itinerary never depend on a third-party map request. */
export default function BackupMap({points,selected,position,onSelect,resetKey}:Props){
 const host=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),features=useRef<L.LayerGroup|null>(null);
 const select=useRef(onSelect);select.current=onSelect;
 const [detailed,setDetailed]=useState(false);
 const pointsKey=points.map(p=>p.id).join(',');
 useEffect(()=>{
  if(!host.current)return;
  const m=L.map(host.current,{zoomControl:false,attributionControl:true,minZoom:9,maxZoom:16,maxBounds:[[-9.15,114.3],[-7.85,116]],maxBoundsViscosity:1}).setView([-8.55,115.2],10);
  map.current=m;
  m.attributionControl.setPrefix(false);
  m.createPane('island-outline').style.zIndex='150';
  L.geoJSON(coastline as GeoJsonObject,{pane:'island-outline',interactive:false,style:{color:'#b4d4d7',weight:1.5,fillColor:'#eef3e5',fillOpacity:1},attribution:'<a href="https://www.naturalearthdata.com/">Natural Earth</a>'}).addTo(m);
  L.tileLayer(import.meta.env.VITE_MAP_TILE_URL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',
   attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).on('tileload',()=>setDetailed(true)).addTo(m);
  features.current=L.layerGroup().addTo(m);
  const resize=new ResizeObserver(()=>m.invalidateSize({pan:false}));resize.observe(host.current);
  return()=>{resize.disconnect();features.current=null;map.current=null;m.remove()};
 },[]);
 useEffect(()=>{
  const m=map.current,layer=features.current;if(!m||!layer)return;
  layer.clearLayers();
  const unique=[...new Map(points.map(p=>[p.id,p])).values()];
  if(points.length>1)L.polyline(points.map(p=>[p.lat,p.lng] as L.LatLngTuple),{color:'#20addb',weight:3,dashArray:'6 8',opacity:.85,interactive:false}).addTo(layer);
  unique.forEach((p,i)=>{
   const icon=L.divIcon({className:'backup-marker',html:`<span class="backup-pin${selected===p.id?' is-selected':''}">${i+1}</span>`,iconSize:[32,32],iconAnchor:[16,16]});
   const marker=L.marker([p.lat,p.lng],{icon,title:p.name,alt:p.name}).bindTooltip(p.name,{direction:'top',offset:[0,-14],permanent:selected===p.id,className:'backup-place-label'}).on('click',()=>select.current(p.id)).addTo(layer);
   marker.getElement()?.setAttribute('aria-label',p.name);
  });
  const focus=unique.find(p=>p.id===selected);
  if(position){L.circleMarker([position.lat,position.lng],{radius:8,color:'#fff',weight:3,fillColor:'#178bea',fillOpacity:1}).bindTooltip('我的位置').addTo(layer);m.setView([position.lat,position.lng],14)}
  else if(focus)m.fitBounds(L.latLngBounds([[focus.lat,focus.lng]]),{maxZoom:14,paddingTopLeft:[28,175],paddingBottomRight:[28,76]});
  else if(unique.length)m.fitBounds(L.latLngBounds(unique.map(p=>[p.lat,p.lng])),{maxZoom:13,paddingTopLeft:[28,175],paddingBottomRight:[28,76]});
 },[pointsKey,selected,position?.lat,position?.lng,resetKey]);
 return <><div ref={host} className="backup-map" aria-label="巴厘岛行程地图"/><div className="backup-map-caption">{detailed?'':'简图 · '}行程点连线 · 道路导航请用 Google</div></>;
}
