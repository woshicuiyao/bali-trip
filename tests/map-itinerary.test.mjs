import {test} from 'node:test';
import assert from 'node:assert/strict';
import {itinerarySegments} from '../app/lib/map-itinerary.ts';
const hotel={id:'pullman',lat:-8.70957,lng:115.16759};
const port={id:'sanur',lat:-8.66957,lng:115.26083};
const island={id:'kelingking',lat:-8.75088,lng:115.47418};
test('whole trip is a distribution, not a false continuous driving route',()=>assert.deepEqual(itinerarySegments([hotel,port,island],true),[]));
test('daily order does not draw a road across the sea',()=>assert.equal(itinerarySegments([hotel,port,island,port,hotel],false).length,2));
test('order retains longitude-latitude coordinates and removes repeated stops',()=>assert.deepEqual(itinerarySegments([hotel,hotel,port],false).map(f=>f.geometry.coordinates),[[[115.16759,-8.70957],[115.26083,-8.66957]]]));
