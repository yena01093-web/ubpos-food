"use strict";(()=>{var e={};e.id=468,e.ids=[468],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},2781:e=>{e.exports=require("stream")},3837:e=>{e.exports=require("util")},1806:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>T,patchFetch:()=>A,requestAsyncStorage:()=>l,routeModule:()=>c,serverHooks:()=>R,staticGenerationAsyncStorage:()=>p});var n={};r.r(n),r.d(n,{GET:()=>d});var a=r(9303),o=r(8716),i=r(670),u=r(5456),s=r(8784),E=r(9406);async function d(e){try{let{auth:t,error:r}=(0,u.mk)(e);if(r)return r;let{searchParams:n}=e.nextUrl,a=n.get("storeId"),o=n.get("period")??"week";if(!a)return(0,E.bG)("storeId가 필요합니다");if(!(0,u.P4)(t,a))return(0,E.ID)();let i=await (0,s.pP)(`SELECT
         COALESCE(SUM(total_price) FILTER (WHERE payment_status='paid'), 0) AS revenue,
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled')) AS orders,
         COALESCE(AVG(total_price) FILTER (WHERE payment_status='paid'), 0) AS avg_price,
         COALESCE(SUM(total_price) FILTER (WHERE payment_status='paid' AND payment_method='card'), 0) AS card_revenue,
         COALESCE(SUM(total_price) FILTER (WHERE payment_status='paid' AND payment_method='cash'), 0) AS cash_revenue
       FROM orders
       WHERE store_id = $1 AND created_at::DATE = CURRENT_DATE`,[a]),d={day:1,week:7,month:30}[o]??7,c=await (0,s.IO)(`SELECT
         created_at::DATE::TEXT AS date,
         COALESCE(SUM(total_price) FILTER (WHERE payment_status='paid'), 0) AS revenue,
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled')) AS orders
       FROM orders
       WHERE store_id = $1
         AND created_at::DATE >= CURRENT_DATE - INTERVAL '${d-1} days'
       GROUP BY created_at::DATE
       ORDER BY created_at::DATE`,[a]),l=await (0,s.IO)(`SELECT
         oi.menu_name,
         SUM(oi.quantity)   AS total_qty,
         SUM(oi.item_total) AS total_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.store_id = $1
         AND o.created_at::DATE >= CURRENT_DATE - INTERVAL '${d-1} days'
         AND o.status NOT IN ('cancelled')
       GROUP BY oi.menu_name
       ORDER BY total_qty DESC
       LIMIT 10`,[a]),p=await (0,s.IO)(`SELECT
         EXTRACT(HOUR FROM created_at)::INT::TEXT AS hour,
         COUNT(*) AS orders
       FROM orders
       WHERE store_id = $1
         AND created_at::DATE >= CURRENT_DATE - INTERVAL '${d-1} days'
         AND status NOT IN ('cancelled')
       GROUP BY hour
       ORDER BY hour`,[a]);return(0,E.ok)({today:i,daily:c,topMenus:l,hourly:p,period:o})}catch(e){return(0,E.I3)(e)}}let c=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/dashboard/revenue/route",pathname:"/api/dashboard/revenue",filename:"route",bundlePath:"app/api/dashboard/revenue/route"},resolvedPagePath:"C:\\Users\\하\\Downloads\\ubpos-food\\src\\app\\api\\dashboard\\revenue\\route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:l,staticGenerationAsyncStorage:p,serverHooks:R}=c,T="/api/dashboard/revenue/route";function A(){return(0,i.patchFetch)({serverHooks:R,staticGenerationAsyncStorage:p})}},5456:(e,t,r)=>{r.d(t,{P4:()=>i,mk:()=>o});var n=r(5183),a=r(9406);function o(e){let t=function(e){try{let t=e.headers.get("authorization")??"",r=t.startsWith("Bearer ")?t.slice(7):null;if(!r)return null;return(0,n.ez)(r)}catch{return null}}(e);return t?{auth:t,error:null}:{auth:null,error:(0,a.Hs)()}}function i(e,t){return"admin"===e.role||e.storeIds.includes(t)}},8784:(e,t,r)=>{r.d(t,{IO:()=>i,pP:()=>u,ZG:()=>s});let n=require("pg"),a=null;function o(){return a||(a=new n.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:!1},max:20,idleTimeoutMillis:3e4,connectionTimeoutMillis:5e3})),a}async function i(e,t){let r=o();return(await r.query(e,t)).rows}async function u(e,t){return(await i(e,t))[0]??null}async function s(e){let t=o(),r=await t.connect();try{await r.query("BEGIN");let t=await e(r);return await r.query("COMMIT"),t}catch(e){throw await r.query("ROLLBACK"),e}finally{r.release()}}},5183:(e,t,r)=>{r.d(t,{A$:()=>E,ab:()=>d,ez:()=>c,si:()=>l});var n=r(1482),a=r.n(n);let o=process.env.JWT_SECRET,i=process.env.JWT_REFRESH_SECRET,u=process.env.JWT_EXPIRES_IN??"15m",s=process.env.JWT_REFRESH_EXPIRES_IN??"7d";function E(e){return a().sign(e,o,{expiresIn:u})}function d(e){return a().sign(e,i,{expiresIn:s})}function c(e){return a().verify(e,o)}function l(e){return a().verify(e,i)}},9406:(e,t,r)=>{r.d(t,{Hs:()=>i,I3:()=>E,ID:()=>u,bG:()=>o,ok:()=>a,v6:()=>s});var n=r(7070);function a(e,t=200){return n.NextResponse.json({ok:!0,data:e},{status:t})}function o(e,t=400){return n.NextResponse.json({ok:!1,message:e},{status:t})}function i(e="인증이 필요합니다"){return o(e,401)}function u(e="권한이 없습니다"){return o(e,403)}function s(e="찾을 수 없습니다"){return o(e,404)}function E(e){return console.error("[API Error]",e),o("서버 오류가 발생했습니다",500)}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[948,972,482],()=>r(1806));module.exports=n})();