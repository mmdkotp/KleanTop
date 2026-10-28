-- KLEANTOP core schema, RLS and trusted order functions. UNTESTED against a live Postgres (see README).
create extension if not exists pgcrypto;

create table categories(id uuid primary key default gen_random_uuid(),slug text unique not null,name_ar text not null,name_en text,image_url text,sort_order int not null default 0,active boolean not null default true,created_at timestamptz default now(),updated_at timestamptz default now());
create table products(id uuid primary key default gen_random_uuid(),category_id uuid references categories(id) on delete restrict,slug text unique not null,name_ar text not null,name_en text,short_desc text,description text,usage_instructions text,safety_warnings text,featured boolean not null default false,active boolean not null default true,seo_title text,seo_description text,created_at timestamptz default now(),updated_at timestamptz default now());
create table product_images(id uuid primary key default gen_random_uuid(),product_id uuid not null references products(id) on delete cascade,url text not null,alt text,sort_order int not null default 0);
create table product_variants(id uuid primary key default gen_random_uuid(),product_id uuid not null references products(id) on delete cascade,sku text unique not null,fragrance text,size_value numeric,size_unit text,price numeric(10,2) not null check(price>=0),compare_at_price numeric(10,2) check(compare_at_price>=0),stock int not null default 0 check(stock>=0),low_stock_threshold int not null default 5,active boolean not null default true,created_at timestamptz default now());
create table bundles(id uuid primary key default gen_random_uuid(),slug text unique not null,name_ar text not null,price numeric(10,2) not null check(price>=0),starts_at timestamptz,ends_at timestamptz,active boolean not null default true);
create table bundle_items(bundle_id uuid references bundles(id) on delete cascade,variant_id uuid references product_variants(id) on delete restrict,qty int not null check(qty>0),primary key(bundle_id,variant_id));
create table orders(id uuid primary key default gen_random_uuid(),ref text unique not null,idempotency_key text unique not null,status text not null default 'pending' check(status in('pending','confirmed','preparing','shipped','delivered','cancelled')),payment_method text not null default 'cod' check(payment_method='cod'),customer_name text not null,phone text not null,governorate text not null,city text not null,address text not null,notes text,admin_notes text,subtotal numeric(10,2) not null default 0,delivery_fee numeric(10,2) not null default 0,total numeric(10,2) not null default 0,created_at timestamptz default now(),updated_at timestamptz default now());
create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders(id) on delete cascade,variant_id uuid references product_variants(id) on delete set null,bundle_id uuid references bundles(id) on delete set null,name_snapshot text not null,variant_snapshot text,unit_price numeric(10,2) not null,qty int not null check(qty>0),deductions jsonb not null default '[]'); -- [{variant_id,qty}] actually deducted, used for restore
create table order_status_history(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders(id) on delete cascade,from_status text,to_status text not null,note text,changed_by uuid,created_at timestamptz default now());
create table site_settings(key text primary key,value text not null,is_public boolean not null default false);
create table admin_profiles(user_id uuid primary key references auth.users(id) on delete cascade,full_name text,active boolean not null default true,created_at timestamptz default now());
create index on products(category_id);create index on product_variants(product_id);create index on orders(status,created_at desc);create index on order_items(order_id);

insert into site_settings values('delivery_fee','0',true),('free_delivery_threshold','0',true),('min_order','0',true),('store_open','true',true),('announcement','',true),('support_phone','',true);

create function is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from admin_profiles where user_id=auth.uid() and active)$$;

do $$ declare t text; begin
 foreach t in array array['categories','products','product_images','product_variants','bundles','bundle_items','orders','order_items','order_status_history','site_settings','admin_profiles'] loop
  execute format('alter table %I enable row level security',t);
  execute format('create policy admin_all on %I for all to authenticated using(is_admin()) with check(is_admin())',t);
 end loop; end $$;
-- Public read of active catalog only. Orders/items/history/admin_profiles have NO public policy.
create policy pub_cat on categories for select using(active);
create policy pub_prod on products for select using(active);
create policy pub_img on product_images for select using(exists(select 1 from products p where p.id=product_id and p.active));
create policy pub_var on product_variants for select using(active and exists(select 1 from products p where p.id=product_id and p.active));
create policy pub_bun on bundles for select using(active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()));
create policy pub_bi on bundle_items for select using(exists(select 1 from bundles b where b.id=bundle_id and b.active));
create policy pub_set on site_settings for select using(is_public);

-- Policy: stock is DEDUCTED at order creation, RESTORED on cancel, unchanged on delivery.
create function create_order(p jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders; it jsonb; v record; b record; bi record; q int; ph text; sub numeric:=0; fee numeric; thr numeric; mn numeric; ded jsonb; oid uuid; key text:=p->>'idempotency_key'; n int:=0;
begin
 if coalesce(key,'')='' or length(key)>100 then raise exception 'invalid_request';end if;
 select * into o from orders where idempotency_key=key; if found then return jsonb_build_object('ref',o.ref,'total',o.total,'status',o.status);end if;
 if (select value from site_settings where key='store_open')<>'true' then raise exception 'store_closed';end if;
 ph:=regexp_replace(coalesce(p->>'phone',''),'[\s\-]','','g'); ph:=regexp_replace(ph,'^(\+?20|0020)','0');
 if ph !~ '^01[0125][0-9]{8}$' then raise exception 'invalid_phone';end if;
 if length(trim(coalesce(p->>'name','')))<3 or length(trim(coalesce(p->>'governorate','')))<2 or length(trim(coalesce(p->>'city','')))<2 or length(trim(coalesce(p->>'address','')))<8 or length(coalesce(p->>'notes',''))>500 or length(p->>'name')>120 or length(p->>'address')>400 then raise exception 'invalid_customer';end if;
 if jsonb_typeof(p->'items')<>'array' or jsonb_array_length(p->'items') not between 1 and 30 then raise exception 'invalid_items';end if;
 insert into orders(ref,idempotency_key,customer_name,phone,governorate,city,address,notes)
  values('KT-'||upper(substr(md5(random()::text||clock_timestamp()::text),1,8)),key,trim(p->>'name'),ph,trim(p->>'governorate'),trim(p->>'city'),trim(p->>'address'),nullif(trim(coalesce(p->>'notes','')),''))
  on conflict(idempotency_key) do nothing returning * into o;
 if not found then select * into o from orders where idempotency_key=key; return jsonb_build_object('ref',o.ref,'total',o.total,'status',o.status);end if;
 for it in select * from jsonb_array_elements(p->'items') loop
  q:=(it->>'qty')::int; if q is null or q<1 or q>50 then raise exception 'invalid_qty';end if; n:=n+1;
  if it->>'variant_id' is not null then
   select v2.*,pr.name_ar pname into v from product_variants v2 join products pr on pr.id=v2.product_id where v2.id=(it->>'variant_id')::uuid and v2.active and pr.active for update of v2;
   if not found then raise exception 'unavailable';end if; if v.stock<q then raise exception 'insufficient_stock:%',v.sku;end if;
   update product_variants set stock=stock-q where id=v.id;
   insert into order_items(order_id,variant_id,name_snapshot,variant_snapshot,unit_price,qty,deductions) values(o.id,v.id,v.pname,concat_ws(' ',v.fragrance,v.size_value::text,v.size_unit),v.price,q,jsonb_build_array(jsonb_build_object('variant_id',v.id,'qty',q)));
   sub:=sub+v.price*q;
  elsif it->>'bundle_id' is not null then
   select * into b from bundles where id=(it->>'bundle_id')::uuid and active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now());
   if not found then raise exception 'unavailable';end if; ded:='[]';
   for bi in select bi2.variant_id,bi2.qty*q need,pv.stock,pv.sku from bundle_items bi2 join product_variants pv on pv.id=bi2.variant_id where bi2.bundle_id=b.id and pv.active order by bi2.variant_id for update of pv loop
    if bi.stock<bi.need then raise exception 'insufficient_stock:%',bi.sku;end if;
    update product_variants set stock=stock-bi.need where id=bi.variant_id; ded:=ded||jsonb_build_array(jsonb_build_object('variant_id',bi.variant_id,'qty',bi.need));
   end loop;
   if jsonb_array_length(ded)=0 or jsonb_array_length(ded)<>(select count(*) from bundle_items where bundle_id=b.id) then raise exception 'unavailable';end if;
   insert into order_items(order_id,bundle_id,name_snapshot,variant_snapshot,unit_price,qty,deductions) values(o.id,b.id,b.name_ar,'باقة',b.price,q,ded); sub:=sub+b.price*q;
  else raise exception 'invalid_items';end if;
 end loop;
 select value::numeric into fee from site_settings where key='delivery_fee';select value::numeric into thr from site_settings where key='free_delivery_threshold';select value::numeric into mn from site_settings where key='min_order';
 if sub<mn then raise exception 'below_minimum';end if; if thr>0 and sub>=thr then fee:=0;end if;
 update orders set subtotal=sub,delivery_fee=fee,total=sub+fee where id=o.id returning * into o;
 insert into order_status_history(order_id,to_status) values(o.id,'pending');
 return jsonb_build_object('ref',o.ref,'total',o.total,'status',o.status);
end $$;
revoke all on function create_order(jsonb) from public; grant execute on function create_order(jsonb) to anon,authenticated;

create function set_order_status(p_ref text,p_status text,p_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare o orders; d jsonb; r record;
begin
 if not is_admin() then raise exception 'forbidden';end if;
 select * into o from orders where ref=p_ref for update; if not found then raise exception 'not_found';end if;
 if not ((o.status='pending' and p_status in('confirmed','cancelled')) or (o.status='confirmed' and p_status in('preparing','cancelled')) or (o.status='preparing' and p_status in('shipped','cancelled')) or (o.status='shipped' and p_status in('delivered','cancelled'))) then raise exception 'invalid_transition';end if;
 if p_status='cancelled' then
  for r in select deductions from order_items where order_id=o.id loop
   for d in select * from jsonb_array_elements(r.deductions) loop update product_variants set stock=stock+(d->>'qty')::int where id=(d->>'variant_id')::uuid; end loop;
  end loop;
 end if;
 update orders set status=p_status,updated_at=now() where id=o.id;
 insert into order_status_history(order_id,from_status,to_status,note,changed_by) values(o.id,o.status,p_status,p_note,auth.uid());
end $$;
revoke all on function set_order_status(text,text,text) from public; grant execute on function set_order_status(text,text,text) to authenticated;
-- First admin (run manually in the SQL editor after creating the user in Supabase Auth):
--   insert into admin_profiles(user_id,full_name) select id,'Owner' from auth.users where email='YOUR_EMAIL';
