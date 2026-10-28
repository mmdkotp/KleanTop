import {products as demo} from '../data/products';
const URL=import.meta.env.VITE_SUPABASE_URL,KEY=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const hasBackend=!!(URL&&KEY&&!URL.includes('your-project'));
const h={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
// Supabase tables `products` and `orders` — schema/RLS finalized in Part 2.
export async function fetchProducts(){
 if(!hasBackend){await new Promise(r=>setTimeout(r,300));return {items:demo.filter(p=>p.active),demo:true};}
 const r=await fetch(`${URL}/rest/v1/products?active=eq.true&select=*`,{headers:h});
 if(!r.ok)throw new Error('تعذر تحميل المنتجات');
 return {items:await r.json(),demo:false};
}
export const linePrice=(p,vi)=>{const v=p.variants?.[vi];return (vi===0&&p.salePrice)?p.salePrice:(v?.price??p.price)};
export const lineStock=(p,vi)=>p.variants?.[vi]?.stock??p.stock;
export async function submitOrder(order){
 if(!hasBackend)throw new Error('لم يتم حفظ الطلب: المتجر في الوضع التجريبي ولا يوجد اتصال بقاعدة بيانات.');
 const r=await fetch(`${URL}/rest/v1/orders`,{method:'POST',headers:{...h,Prefer:'return=minimal'},body:JSON.stringify(order)});
 if(!r.ok)throw new Error('تعذر حفظ الطلب، حاول مرة أخرى.');
}
