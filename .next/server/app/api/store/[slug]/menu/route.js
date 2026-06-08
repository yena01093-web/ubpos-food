"use strict";(()=>{var e={};e.id=329,e.ids=[329],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9675:(e,o,r)=>{r.r(o),r.d(o,{originalPathname:()=>c,patchFetch:()=>g,requestAsyncStorage:()=>p,routeModule:()=>_,serverHooks:()=>l,staticGenerationAsyncStorage:()=>m});var t={};r.r(t),r.d(t,{GET:()=>d});var i=r(9303),n=r(8716),s=r(670),u=r(8784),a=r(9406);async function d(e,{params:o}){try{let e=await (0,u.pP)(`SELECT id, name, logo_url, is_open, notice, phone
       FROM stores WHERE slug = $1`,[o.slug]);if(!e)return(0,a.v6)("가맹점을 찾을 수 없습니다");let r=await (0,u.IO)(`SELECT id, name, sort_order
       FROM categories
       WHERE store_id = $1 AND is_active = true
       ORDER BY sort_order`,[e.id]),t=await (0,u.IO)(`SELECT
         m.id           AS menu_id,
         m.name         AS menu_name,
         m.description,
         m.price,
         m.image_url,
         m.is_soldout,
         m.sort_order,
         m.category_id,
         og.id          AS og_id,
         og.name        AS og_name,
         og.is_required AS og_required,
         og.max_select  AS og_max,
         og.sort_order  AS og_sort,
         o.id           AS opt_id,
         o.name         AS opt_name,
         o.extra_price  AS opt_extra,
         o.is_soldout   AS opt_soldout,
         o.sort_order   AS opt_sort
       FROM menus m
       LEFT JOIN option_groups og ON og.menu_id = m.id
       LEFT JOIN options o        ON o.group_id = og.id
       WHERE m.store_id = $1 AND m.is_active = true
       ORDER BY m.sort_order, og.sort_order, o.sort_order`,[e.id]),i=new Map;for(let e of t){i.has(e.menu_id)||i.set(e.menu_id,{id:e.menu_id,name:e.menu_name,description:e.description,price:e.price,image_url:e.image_url,is_soldout:e.is_soldout,sort_order:e.sort_order,category_id:e.category_id,option_groups:new Map});let o=i.get(e.menu_id);e.og_id&&!o.option_groups.has(e.og_id)&&o.option_groups.set(e.og_id,{id:e.og_id,name:e.og_name,is_required:e.og_required,max_select:e.og_max,sort_order:e.og_sort,options:[]}),e.og_id&&e.opt_id&&o.option_groups.get(e.og_id).options.push({id:e.opt_id,name:e.opt_name,extra_price:e.opt_extra,is_soldout:e.opt_soldout,sort_order:e.opt_sort})}let n=r.map(e=>({...e,menus:[...i.values()].filter(o=>o.category_id===e.id).map(e=>({...e,option_groups:[...e.option_groups.values()]})).sort((e,o)=>e.sort_order-o.sort_order)}));return(0,a.ok)({store:e,categories:n})}catch(e){return(0,a.I3)(e)}}let _=new i.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/store/[slug]/menu/route",pathname:"/api/store/[slug]/menu",filename:"route",bundlePath:"app/api/store/[slug]/menu/route"},resolvedPagePath:"C:\\Users\\하\\Downloads\\ubpos-food\\src\\app\\api\\store\\[slug]\\menu\\route.ts",nextConfigOutput:"",userland:t}),{requestAsyncStorage:p,staticGenerationAsyncStorage:m,serverHooks:l}=_,c="/api/store/[slug]/menu/route";function g(){return(0,s.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:m})}},8784:(e,o,r)=>{r.d(o,{IO:()=>s,pP:()=>u,ZG:()=>a});let t=require("pg"),i=null;function n(){return i||(i=new t.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:!1},max:20,idleTimeoutMillis:3e4,connectionTimeoutMillis:5e3})),i}async function s(e,o){let r=n();return(await r.query(e,o)).rows}async function u(e,o){return(await s(e,o))[0]??null}async function a(e){let o=n(),r=await o.connect();try{await r.query("BEGIN");let o=await e(r);return await r.query("COMMIT"),o}catch(e){throw await r.query("ROLLBACK"),e}finally{r.release()}}},9406:(e,o,r)=>{r.d(o,{Hs:()=>s,I3:()=>d,ID:()=>u,bG:()=>n,ok:()=>i,v6:()=>a});var t=r(7070);function i(e,o=200){return t.NextResponse.json({ok:!0,data:e},{status:o})}function n(e,o=400){return t.NextResponse.json({ok:!1,message:e},{status:o})}function s(e="인증이 필요합니다"){return n(e,401)}function u(e="권한이 없습니다"){return n(e,403)}function a(e="찾을 수 없습니다"){return n(e,404)}function d(e){return console.error("[API Error]",e),n("서버 오류가 발생했습니다",500)}}};var o=require("../../../../../webpack-runtime.js");o.C(e);var r=e=>o(o.s=e),t=o.X(0,[948,972],()=>r(9675));module.exports=t})();