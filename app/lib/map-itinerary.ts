import type {Place} from './places';
import {islandOf} from './google-maps.ts';
// Itinerary order hints, never road or ferry route geometries.
export function itinerarySegments(points:Place[],overview:boolean){
 if(overview)return [];
 return points.slice(1).flatMap((p,i)=>{
  const previous=points[i];
  if(previous.id===p.id||islandOf(previous)!==islandOf(p))return [];
  return [{type:'Feature' as const,properties:{},geometry:{type:'LineString' as const,coordinates:[[previous.lng,previous.lat],[p.lng,p.lat]]}}];
 });
}
