import {useMemo,useState} from 'react';import {Link,useParams,useNavigate,useLocation} from 'react-router-dom';
import ProductCard,{StockBadge,stockOf} from '../components/ProductCard';import {Loading,ErrorBox,DemoBanner} from '../components/State';
import useProducts from '../lib/useProducts';import {useCart} from '../lib/cart';
import {fmt,SHIPPING,COUPONS} from '../lib/config';import {linePrice,lineStock,fetchProducts,submitOrder,hasBackend} from '../lib/api';import {CATEGORIES} from '../data/products';

export function Home(){const s=useProducts();
return <><section className="hero"><div><h1>نظافة تفرق</h1><p>كلين توب — سائل غسيل أطباق مصري بقوة تنظيف حقيقية ولمسة منعشة.</p><Link className="btn" to="/shop">تسوّق الآن</Link></div><div className="bubble">🧴</div></section>
<section><h2>منتجات مميزة</h2>{s.loading?<Loading/>:s.error?<ErrorBox msg={s.error}/>:<>{s.demo&&<DemoBanner/>}<div className="grid">{s.items.slice(0,4).map(p=><ProductCard key={p.id} p={p}/>)}</div></>}</section>
<section className="benefits">{[['🌿','تركيبة لطيفة'],['💪','تزيل الدهون بسهولة'],['🚚','توصيل والدفع عند الاستلام']].map(([i,t])=><div key={t}><span>{i}</span>{t}</div>)}</section>
<section className="promo">وفّر أكثر مع عبوات التوفير والباقات — شحن مجاني للطلبات فوق {fmt(SHIPPING.freeOver)} (تجريبي)</section></>}

export function Shop(){const s=useProducts();const [q,setQ]=useState('');const [cat,setCat]=useState('الكل');const [sort,setSort]=useState('new');const [inStock,setIn]=useState(false);
const list=useMemo(()=>{if(!s.items)return[];let l=s.items.filter(p=>(cat==='الكل'||p.category===cat)&&p.name.includes(q.trim())&&(!inStock||stockOf(p)>0));
 const pr=p=>p.salePrice||p.price;if(sort==='low')l=[...l].sort((a,b)=>pr(a)-pr(b));if(sort==='high')l=[...l].sort((a,b)=>pr(b)-pr(a));return l},[s.items,q,cat,sort,inStock]);
return <><h1>المتجر</h1><div className="filters"><input type="search" aria-label="بحث" placeholder="ابحث عن منتج…" value={q} onChange={e=>setQ(e.target.value)}/>
<select aria-label="التصنيف" value={cat} onChange={e=>setCat(e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
<select aria-label="الترتيب" value={sort} onChange={e=>setSort(e.target.value)}><option value="new">الأحدث</option><option value="low">السعر: الأقل</option><option value="high">السعر: الأعلى</option></select>
<label><input type="checkbox" checked={inStock} onChange={e=>setIn(e.target.checked)}/> المتوفر فقط</label></div>
{s.loading?<Loading/>:s.error?<ErrorBox msg={s.error}/>:<>{s.demo&&<DemoBanner/>}{list.length?<div className="grid">{list.map(p=><ProductCard key={p.id} p={p}/>)}</div>:<p className="state">لا توجد منتجات مطابقة.</p>}</>}</>}

export function Product(){const {id}=useParams();const s=useProducts();const {add}=useCart();const [vi,setVi]=useState(0);const [qty,setQty]=useState(1);const [done,setDone]=useState(false);
if(s.loading)return <Loading/>;if(s.error)return <ErrorBox msg={s.error}/>;const p=s.items.find(x=>x.id===id);if(!p)return <p className="state">المنتج غير موجود.</p>;
const stock=lineStock(p,vi),price=linePrice(p,vi);
return <div className="pd"><div className="img big">{p.images?.[0]?<img src={p.images[0]} alt={p.name}/>:'🧴'}</div><div>
{s.demo&&<DemoBanner/>}<h1>{p.name}</h1><p className="muted">SKU: {p.sku} · {p.category}</p><p>{p.description}</p>
{p.variants?.length>1&&<label>الحجم<select value={vi} onChange={e=>{setVi(+e.target.value);setQty(1)}}>{p.variants.map((v,i)=><option key={i} value={i}>{v.label}</option>)}</select></label>}
{p.scents?.length>0&&<p className="muted">الروائح المتاحة: {p.scents.join('، ')}</p>}
<div className="price big">{vi===0&&p.salePrice&&<s>{fmt(p.variants?.[0]?.price??p.price)}</s>} <b>{fmt(price)}</b></div><StockBadge n={stock}/>
<div className="qty"><button aria-label="إنقاص" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span>{qty}</span><button aria-label="زيادة" disabled={qty>=stock} onClick={()=>setQty(qty+1)}>+</button></div>
<button className="btn" disabled={stock<=0} onClick={()=>{add(p.id,vi,qty);setDone(true)}}>{stock<=0?'غير متوفر':'أضف إلى السلة'}</button>
{done&&<p className="ok" role="status">تمت الإضافة. <Link to="/cart">عرض السلة</Link></p>}</div></div>}

// Resolves cart lines against fresh product data; clamps to stock; drops dead items.
export function useResolved(){const s=useProducts();const {lines}=useCart();
const items=(s.items?lines.map(l=>{const p=s.items.find(x=>x.id===l.id);return p&&p.variants?.[l.vi]?{...l,p,price:linePrice(p,l.vi),stock:lineStock(p,l.vi),label:p.variants[l.vi].label}:null}).filter(Boolean):[]);
return {...s,items,products:s.items};}
export function totals(items,code){const sub=items.reduce((a,i)=>a+i.price*i.qty,0);const c=COUPONS[code?.trim().toUpperCase()];
const disc=c?Math.round(sub*c.value)/100:0;const ship=!items.length||sub-disc>=SHIPPING.freeOver?0:SHIPPING.fee;return {sub,disc,ship,total:sub-disc+ship,valid:!!c}}

function Summary({t}){return <div className="sum"><div><span>المجموع الفرعي</span><span>{fmt(t.sub)}</span></div>{t.disc>0&&<div><span>الخصم</span><span>−{fmt(t.disc)}</span></div>}<div><span>الشحن</span><span>{t.ship?fmt(t.ship):'مجاني'}</span></div><div className="tot"><span>الإجمالي</span><span>{fmt(t.total)}</span></div></div>}

export function Cart(){const r=useResolved();const {setQty,remove}=useCart();const [code,setCode]=useState('');
if(r.loading)return <Loading/>;if(r.error)return <ErrorBox msg={r.error}/>;
const t=totals(r.items,code);const bad=r.items.some(i=>i.stock<i.qty);
return <><h1>سلة التسوق</h1>{!r.items.length?<p className="state">سلتك فارغة. <Link to="/shop">تصفّح المتجر</Link></p>:<div className="cols"><div>
{r.items.map(i=><div className="line" key={i.id+i.vi}><div><b>{i.p.name}</b><br/><small>{i.label} · {fmt(i.price)}</small>{i.stock<i.qty&&<p className="err">المتاح {i.stock} فقط — عدّل الكمية.</p>}</div>
<div className="qty"><button aria-label="إنقاص" onClick={()=>setQty(i.id,i.vi,i.qty-1)}>−</button><span>{i.qty}</span><button aria-label="زيادة" disabled={i.qty>=i.stock} onClick={()=>setQty(i.id,i.vi,i.qty+1)}>+</button></div>
<b>{fmt(i.price*i.qty)}</b><button className="link" onClick={()=>remove(i.id,i.vi)}>حذف</button></div>)}</div>
<aside><label>كود الخصم<input value={code} onChange={e=>setCode(e.target.value)} placeholder="KLEAN10 (تجريبي)"/></label>{code&&!t.valid&&<p className="err">الكود غير صالح</p>}
<Summary t={t}/><Link className={'btn'+(bad?' dis':'')} to="/checkout" state={{code}} aria-disabled={bad} onClick={e=>bad&&e.preventDefault()}>إتمام الطلب</Link></aside></div>}</>}

export function Checkout(){const r=useResolved();const {clear}=useCart();const nav=useNavigate();const {state}=useLocation();const code=state?.code||'';
const [f,setF]=useState({name:'',phone:'',city:'',address:'',notes:''});const [err,setErr]=useState({});const [busy,setBusy]=useState(false);const [fail,setFail]=useState('');
if(r.loading)return <Loading/>;if(r.error)return <ErrorBox msg={r.error}/>;if(!r.items.length)return <p className="state">سلتك فارغة. <Link to="/shop">المتجر</Link></p>;
const set=k=>e=>setF({...f,[k]:e.target.value});
const submit=async e=>{e.preventDefault();const v={};
 if(f.name.trim().length<3)v.name='أدخل الاسم الكامل';if(!/^01[0125]\d{8}$/.test(f.phone.trim()))v.phone='رقم موبايل مصري غير صالح (11 رقم)';
 if(!f.city.trim())v.city='أدخل المدينة/المنطقة';if(f.address.trim().length<8)v.address='أدخل العنوان بالتفصيل';setErr(v);if(Object.keys(v).length)return;
 setBusy(true);setFail('');
 try{ // re-validate stock & prices against fresh data before accepting
  const fresh=await fetchProducts();const items=r.items.map(i=>{const p=fresh.items.find(x=>x.id===i.id);if(!p||lineStock(p,i.vi)<i.qty)throw new Error(`الكمية المطلوبة من "${i.p.name}" لم تعد متاحة.`);return {...i,price:linePrice(p,i.vi)}});
  const t=totals(items,code);const ref='KT-'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
  const order={ref,status:'pending',payment_method:'cod',customer_name:f.name.trim(),phone:f.phone.trim(),city:f.city.trim(),address:f.address.trim(),notes:f.notes.trim()||null,
   items:items.map(i=>({id:i.id,sku:i.p.sku,name:i.p.name,variant:i.label,qty:i.qty,price:i.price})),subtotal:t.sub,discount:t.disc,shipping:t.ship,total:t.total,coupon:t.valid?code.toUpperCase():null};
  await submitOrder(order);clear();nav('/confirmation',{state:{order},replace:true});
 }catch(x){setFail(x.message)}finally{setBusy(false)}};
const F=({k,label,type='text',area})=><label>{label}{area?<textarea rows="3" value={f[k]} onChange={set(k)}/>:<input type={type} value={f[k]} onChange={set(k)} aria-invalid={!!err[k]} inputMode={k==='phone'?'tel':undefined}/>}{err[k]&&<span className="err">{err[k]}</span>}</label>;
return <><h1>إتمام الطلب</h1><div className="cols"><form onSubmit={submit} noValidate><F k="name" label="الاسم الكامل"/><F k="phone" label="رقم الموبايل" type="tel"/><F k="city" label="المدينة / المنطقة"/><F k="address" label="العنوان بالتفصيل" area/><F k="notes" label="ملاحظات (اختياري)" area/>
<p className="muted">طريقة الدفع: الدفع عند الاستلام</p>{fail&&<p className="state err" role="alert">{fail}</p>}<button className="btn" disabled={busy}>{busy?'جارٍ الإرسال…':'تأكيد الطلب'}</button></form>
<aside><h3>ملخص الطلب</h3>{r.items.map(i=><div className="sum" key={i.id+i.vi}><div><span>{i.p.name} ({i.label}) × {i.qty}</span><span>{fmt(i.price*i.qty)}</span></div></div>)}<Summary t={totals(r.items,code)}/>{!hasBackend&&<p className="demo">الوضع التجريبي: لن يتم حفظ الطلب حتى يتم ربط قاعدة البيانات.</p>}</aside></div></>}

export function Confirmation(){const {state}=useLocation();const o=state?.order;
if(!o)return <p className="state">لا يوجد طلب لعرضه. <Link to="/shop">المتجر</Link></p>;
return <div className="conf"><h1>✅ تم استلام طلبك</h1><p>رقم الطلب: <b dir="ltr">{o.ref}</b> · الحالة: قيد المراجعة</p>
{o.items.map((i,k)=><div className="sum" key={k}><div><span>{i.name} ({i.variant}) × {i.qty}</span><span>{fmt(i.price*i.qty)}</span></div></div>)}
<Summary t={{sub:o.subtotal,disc:o.discount,ship:o.shipping,total:o.total}}/><p>سيتم التواصل معك على {o.phone} لتأكيد التوصيل. الدفع عند الاستلام.</p><Link className="btn" to="/shop">متابعة التسوق</Link></div>}

export const About=()=><><h1>من نحن</h1><p>كلين توب (KLEANTOP) علامة مصرية لسوائل غسيل الأطباق، شعارنا «نظافة تفرق». <span className="muted">(نص تجريبي — سيحدّثه المالك.)</span></p></>;
export function Contact(){const [sent,setSent]=useState(false);return <><h1>اتصل بنا</h1><p className="muted">بيانات التواصل تجريبية: الهاتف 01XXXXXXXXX · info@example.com</p>
<form onSubmit={e=>{e.preventDefault();setSent(true)}}><label>الاسم<input required/></label><label>الرسالة<textarea required rows="4"/></label><button className="btn">إرسال</button>
{sent&&<p className="demo" role="status">نموذج تجريبي: لم يتم إرسال الرسالة فعلياً، سيتم ربطه لاحقاً.</p>}</form></>}
