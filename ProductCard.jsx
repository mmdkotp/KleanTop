import {Link} from 'react-router-dom';import {fmt,LOW_STOCK} from '../lib/config';
export const stockOf=p=>p.variants?.length?p.variants.reduce((s,v)=>s+v.stock,0):p.stock;
export function StockBadge({n}){return n<=0?<span className="badge out">غير متوفر</span>:n<=LOW_STOCK?<span className="badge low">كمية محدودة ({n})</span>:<span className="badge ok">متوفر</span>}
export default function ProductCard({p}){const n=stockOf(p);
return <Link to={`/product/${p.id}`} className="card"><div className="img" aria-hidden>{p.images?.[0]?<img src={p.images[0]} alt=""/>:'🧴'}</div>
<h3>{p.name}</h3><div className="price">{p.salePrice?<><s>{fmt(p.price)}</s> <b>{fmt(p.salePrice)}</b></>:<b>{fmt(p.price)}</b>}</div><StockBadge n={n}/></Link>}
