// DEMO business rules — move to DB/admin settings in Part 2.
export const SHIPPING={fee:40,freeOver:500};
export const COUPONS={KLEAN10:{type:'percent',value:10}};
export const LOW_STOCK=5;
export const fmt=n=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:2}).format(n)+' ج.م';
