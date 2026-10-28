import {useEffect,useState} from 'react';import {fetchProducts} from './api';
export default function useProducts(){const [s,set]=useState({loading:true});
 useEffect(()=>{fetchProducts().then(d=>set({...d,loading:false})).catch(e=>set({loading:false,error:e.message}))},[]);return s}
