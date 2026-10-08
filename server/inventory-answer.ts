export type InventoryRecord={id:number;name:string;space:string;zone:string;quantity:number;unit:string;status:string;par:number;vendor?:string;reorderUrl?:string;notes?:string;updatedAt?:string};
export function selectInventoryRecords(items:InventoryRecord[],question:string){
 const stop=new Set('a an the how many much do does did we have got get what where is are our in on of it from buy bought stock item items can you tell me please'.split(' '));
 const words=[...new Set(question.toLowerCase().match(/[a-z0-9]+/g)||[])].filter(word=>!stop.has(word));
 if(!words.length)return [];
 const scored=items.map(item=>{const name=item.name.toLowerCase();const other=[item.space,item.zone,item.vendor,item.notes].join(' ').toLowerCase();return {item,score:words.reduce((score,word)=>score+(name.includes(word)?5:other.includes(word)?1:0),0)};}).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
 return scored.slice(0,80).map(({item})=>({id:item.id,name:item.name,space:item.space,zone:item.zone,quantity:item.status==='Count needed'?null:item.quantity,unit:item.unit,status:item.status,par:item.par,vendor:item.vendor||null,reorderUrl:item.reorderUrl||null,notes:item.notes?.slice(0,800)||'',updatedAt:item.updatedAt||null}));
}
