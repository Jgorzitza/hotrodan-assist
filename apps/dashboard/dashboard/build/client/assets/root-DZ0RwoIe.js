import{r as n,j as t}from"./index-DDfvNczm.js";import{u as m,a as y,b as x,c as f,_ as S,M as j,L as w,O as g,S as k}from"./components-CQiYnUFB.js";/**
 * @remix-run/react v2.17.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */const a="positions";function M({getKey:r,...l}){const{isSpaMode:c}=m(),o=y(),u=x();f({getKey:r,storageKey:a});const h=n.useMemo(()=>{if(!r)return null;const e=r(o,u);return e!==o.key?e:null},[]);if(c)return null;const p=((e,d)=>{if(!window.history.state||!window.history.state.key){const s=Math.random().toString(32).slice(2);window.history.replaceState({key:s},"")}try{const i=JSON.parse(sessionStorage.getItem(e)||"{}")[d||window.history.state.key];typeof i=="number"&&window.scrollTo(0,i)}catch(s){console.error(s),sessionStorage.removeItem(e)}}).toString();return n.createElement("script",S({},l,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${p})(${JSON.stringify(a)}, ${JSON.stringify(h)})`}}))}function L(){return t.jsxs("html",{children:[t.jsxs("head",{children:[t.jsx("meta",{charSet:"utf-8"}),t.jsx("meta",{name:"viewport",content:"width=device-width,initial-scale=1"}),t.jsx("link",{rel:"preconnect",href:"https://cdn.shopify.com/"}),t.jsx("link",{rel:"stylesheet",href:"https://cdn.shopify.com/static/fonts/inter/v4/styles.css"}),t.jsx(j,{}),t.jsx(w,{})]}),t.jsxs("body",{children:[t.jsx(g,{}),t.jsx(M,{}),t.jsx(k,{})]})]})}export{L as default};
