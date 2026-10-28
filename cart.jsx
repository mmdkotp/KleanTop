import {createContext,useContext,useEffect,useState} from 'react';
const C=createContext();export const useCart=()=>useContext(C);
const KEY='kt_cart_v1'; // only {id,vi,qty} — no customer data
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
export function CartProvider({children}){
 const [lines,setLines]=useState(load);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(lines))}catch{}},[lines]);
 const same=(x,id,vi)=>x.id===id&&x.vi===vi;
 const add=(id,vi,qty=1)=>setLines(l=>l.some(x=>same(x,id,vi))?l.map(x=>same(x,id,vi)?{...x,qty:x.qty+qty}:x):[...l,{id,vi,qty}]);
 const setQty=(id,vi,qty)=>setLines(l=>l.map(x=>same(x,id,vi)?{...x,qty:Math.max(1,qty)}:x));
 const remove=(id,vi)=>setLines(l=>l.filter(x=>!same(x,id,vi)));
 const clear=()=>setLines([]);
 return <C.Provider value={{lines,add,setQty,remove,clear,count:lines.reduce((s,x)=>s+x.qty,0)}}>{children}</C.Provider>}
