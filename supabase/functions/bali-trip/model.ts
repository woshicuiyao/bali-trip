export type Item=Record<string,any> & {id:string};
export type Trip={days:Item[];events:Item[];stays:Item[];flights:Item[];tasks:Item[];bookings:Item[];foods:Item[];history:Item[]};
export type Collection='events'|'stays'|'flights'|'tasks'|'bookings';
export type Mutation={collection:Collection;id:string;action:'update'|'add'|'delete';changes?:Record<string,unknown>};
export type Snapshot={data:Trip;version:number;role:'edit'|'view';updatedAt:string};
export const labels:Record<string,string>={sport:'运动',sightseeing:'景点',hiking:'徒步',transfer:'交通',flight:'航班',arrival:'抵达',checkin:'入住',checkout:'退房',rest:'休整',meal:'餐饮',optional:'可选',performance:'演出',boat:'船程',snorkeling:'海上活动',airport:'机场',shopping:'购物'};
