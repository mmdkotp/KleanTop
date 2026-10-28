import {Routes,Route} from 'react-router-dom';import Layout from './components/Layout';
import {Home,Shop,Product,Cart,Checkout,Confirmation,About,Contact} from './pages';
export default function App(){return <Layout><Routes>
<Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/product/:id" element={<Product/>}/>
<Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/confirmation" element={<Confirmation/>}/>
<Route path="/about" element={<About/>}/><Route path="/contact" element={<Contact/>}/><Route path="*" element={<p className="state">الصفحة غير موجودة</p>}/></Routes></Layout>}
