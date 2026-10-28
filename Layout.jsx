import {useState} from 'react';import {Link,NavLink} from 'react-router-dom';import {useCart} from '../lib/cart';
const links=[['/','الرئيسية'],['/shop','المتجر'],['/about','من نحن'],['/contact','اتصل بنا']];
export default function Layout({children}){const [open,setOpen]=useState(false);const {count}=useCart();
return <><header className="hdr"><div className="wrap row">
<Link to="/" className="logo">KLEAN<b>TOP</b> <small>كلين توب</small></Link>
<button className="burger" aria-label="القائمة" aria-expanded={open} onClick={()=>setOpen(!open)}>☰</button>
<nav className={open?'nav open':'nav'} onClick={()=>setOpen(false)}>{links.map(([t,l])=><NavLink key={t} to={t} end={t==='/'}>{l}</NavLink>)}</nav>
<Link to="/cart" className="cartbtn" aria-label="السلة">🛒<span>{count}</span></Link></div></header>
<main className="wrap">{children}</main>
<footer className="ftr"><div className="wrap"><b>KLEANTOP — كلين توب</b> · نظافة تفرق<br/><small>الدفع عند الاستلام · © {new Date().getFullYear()}</small></div></footer></>}
