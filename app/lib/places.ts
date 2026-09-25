export type Place = {id:string;name:string;lat:number;lng:number;kind:string;image?:string;source:string;approximate?:boolean};
export const places:Place[]=[
{id:'pullman',name:'勒吉安海滩铂尔曼',lat:-8.70957,lng:115.16759,kind:'住宿',image:`${import.meta.env.BASE_URL}photos/pullman.jpg`,source:'https://www.pullman-bali-legianbeach.com/'},
{id:'adiwana',name:'阿迪瓦纳阿拉斯哈鲁姆',lat:-8.48901,lng:115.25858,kind:'住宿',image:`${import.meta.env.BASE_URL}photos/adiwana.webp`,source:'https://adiwanahotels.com/alas-harum-resort-ubud-bali/contact/'},
{id:'sanur',name:'沙努尔码头',lat:-8.66957,lng:115.26083,kind:'交通',approximate:true,source:'https://www.google.com/maps/search/?api=1&query=Sanur+Harbour'},
{id:'palace',name:'乌布皇宫',lat:-8.50668,lng:115.26271,kind:'景点',approximate:true,source:'https://commons.wikimedia.org/wiki/File:Ubud_Palace,_Bali,_Indonesia,_20220822_0904_9820.jpg'},
{id:'ridge',name:'坎普罕山脊',lat:-8.49852,lng:115.25523,kind:'徒步',approximate:true,source:'https://commons.wikimedia.org/wiki/File:Campuhan_Ridge_Walk,_Ubud,_Bali,_20220822_1422_0140.jpg'},
{id:'terraces',name:'德格拉朗梯田',lat:-8.43363,lng:115.27888,kind:'景点',approximate:true,source:'https://commons.wikimedia.org/wiki/File:Beautiful_rice_terraces_in_Tagallalang.jpg'},
{id:'uluwatu',name:'乌鲁瓦图情人崖',lat:-8.82915,lng:115.08491,kind:'景点',approximate:true,source:'https://commons.wikimedia.org/wiki/File:Uluwatu_Temple_(49813008278).jpg'},
{id:'kelingking',name:'佩尼达 · 精灵坠崖',lat:-8.75088,lng:115.47418,kind:'景点',approximate:true,source:'https://commons.wikimedia.org/wiki/File:Kelingking_Beach,_Nusa_Penida.jpg'},
{id:'broken',name:'破碎沙滩',lat:-8.73343,lng:115.45091,kind:'景点',approximate:true,source:'https://commons.wikimedia.org/wiki/File:Nusa_Penida_-_Bali_-_Broken_Beach.jpg'},
{id:'crystal',name:'水晶湾',lat:-8.71494,lng:115.45858,kind:'景点',approximate:true,source:'https://www.rajahutantour.com/pantai-crystal-bay-nusa-penida-bali/'}];
export const placeById=(id:string)=>places.find(p=>p.id===id);
