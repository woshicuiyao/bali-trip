import type {Place} from './places';

const queries:Record<string,string>={
 pullman:'Pullman Bali Legian Beach, Bali, Indonesia',
 adiwana:'Adiwana Alas Harum, Keliki, Bali, Indonesia',
 sanur:'Sanur Harbour, Bali, Indonesia',
 palace:'Ubud Palace, Bali, Indonesia',
 ridge:'Campuhan Ridge Walk, Ubud, Bali, Indonesia',
 terraces:'Tegallalang Rice Terrace, Bali, Indonesia',
 uluwatu:'Uluwatu Temple, Bali, Indonesia',
 kelingking:'Kelingking Beach, Nusa Penida, Bali, Indonesia',
 broken:'Broken Beach, Nusa Penida, Bali, Indonesia',
 crystal:'Crystal Bay, Nusa Penida, Bali, Indonesia',
};
export const googleQuery=(p:Place)=>queries[p.id]||`${p.lat},${p.lng}`;
export const islandOf=(p:Place)=>['kelingking','broken','crystal'].includes(p.id)?'penida':'bali';
export type MapLeg={island:string;points:Place[];label:string};
export function mapLegs(points:Place[]):MapLeg[]{
 const groups:MapLeg[]=[];
 for(const p of points){const island=islandOf(p);let current=groups.at(-1);if(!current||current.island!==island){current={island,points:[],label:''};groups.push(current);}if(current.points.at(-1)?.id!==p.id)current.points.push(p);}
 const legs:MapLeg[]=[];
 for(const group of groups){for(let i=0;i<Math.max(1,group.points.length-1);i+=4){legs.push({...group,points:group.points.slice(i,i+5)});}}
 const totals:Record<string,number>={};const indexes:Record<string,number>={};legs.forEach(l=>totals[l.island]=(totals[l.island]||0)+1);
 return legs.map(l=>{indexes[l.island]=(indexes[l.island]||0)+1;return {...l,label:(l.island==='bali'?'巴厘岛本岛':'佩尼达岛')+(totals[l.island]>1?` · ${indexes[l.island]}`:'')}});
}
// Consumer Google Maps embeds redirect to Google's own /maps/embed renderer.
// These are not Maps JavaScript / Routes API calls and contain no billing key.
export function googleEmbedUrl(points:Place[],position?:{lat:number;lng:number}|null){
 const url=new URL('https://maps.google.com/maps');url.searchParams.set('hl','zh-CN');url.searchParams.set('output','embed');
 if(position){url.searchParams.set('q',`${position.lat},${position.lng}`);url.searchParams.set('z','15');}
 else if(points.length>1){url.searchParams.set('saddr',googleQuery(points[0]));url.searchParams.set('daddr',points.slice(1).map(googleQuery).join(' to:'));url.searchParams.set('dirflg','d');}
 else {url.searchParams.set('q',points[0]?googleQuery(points[0]):'Bali, Indonesia');url.searchParams.set('z',points[0]?'13':'10');}
 return url.toString();
}
export function googleMapsUrl(points:Place[],navigate=false){
 if(!points.length)return 'https://www.google.com/maps/search/?api=1&query=Bali%2C%20Indonesia';
 const url=new URL(points.length>1||navigate?'https://www.google.com/maps/dir/':'https://www.google.com/maps/search/');url.searchParams.set('api','1');
 if(navigate){url.searchParams.set('destination',googleQuery(points.at(-1)!));url.searchParams.set('dir_action','navigate');}
 else if(points.length>1){url.searchParams.set('origin',googleQuery(points[0]));url.searchParams.set('destination',googleQuery(points.at(-1)!));if(points.length>2)url.searchParams.set('waypoints',points.slice(1,-1).map(googleQuery).join('|'));url.searchParams.set('travelmode','driving');}
 else url.searchParams.set('query',googleQuery(points[0]));
 return url.toString();
}
