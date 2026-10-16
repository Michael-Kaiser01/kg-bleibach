/* KG Bleibach — Sprachumschaltung: op Kölsch (Standard) / Auf Hochdeutsch.
   Der HTML-Quelltext bleibt hochdeutsch (Suchmaschinen); Kölsch wird im Browser eingesetzt. */
(function(){
  'use strict';
  var DICT = window.KGB_KSH || {};
  var INLINE={A:1,B:1,I:1,EM:1,STRONG:1,SPAN:1,SMALL:1,BR:1,WBR:1,SUP:1,MARK:1,ABBR:1,U:1};
  var SKIP={SCRIPT:1,STYLE:1,SVG:1,AUDIO:1,NOSCRIPT:1,TEMPLATE:1,HEAD:1,BUTTON_LANG:1};
  var HASL=/[A-Za-zÄÖÜäöüß]/;
  var ATTRS=['aria-label','alt','title'];
  var KEY='kgbLang', lang='ksh', applying=false, mo=null;
  function norm(h){ return h.replace(/\s+/g,' ').trim(); }
  function inlineOnly(el){ var c=el.children; for(var i=0;i<c.length;i++){ if(!INLINE[c[i].tagName]||!inlineOnly(c[i])) return false; } return true; }
  function ownText(el){ var c=el.childNodes; for(var i=0;i<c.length;i++){ if(c[i].nodeType===3&&HASL.test(c[i].nodeValue)) return true; } return false; }
  function isWord(el){ return el.classList&&el.classList.contains('i-w'); }
  function key(el){ return isWord(el) ? 'W:'+el.textContent.replace(/ /g,' ') : norm(el.innerHTML); }
  function collect(root,out){
    var c=root.children;
    for(var i=0;i<c.length;i++){ var e=c[i];
      if(SKIP[e.tagName]||e.hasAttribute('data-nolang')||(e.classList&&e.classList.contains('modal'))) continue;
      if(!HASL.test(e.textContent)) continue;
      if(isWord(e)){ out.push(e); continue; }
      if(ownText(e)&&inlineOnly(e)&&!e.querySelector('[id],[data-c]')) out.push(e); else collect(e,out);
    }
  }
  function buildWord(el,txt){
    var old=el.textContent.length, h='', i, ch;
    for(i=0;i<txt.length;i++){ ch=txt.charAt(i); h+='<i style="--i:'+i+'">'+(ch===' '?'&nbsp;':ch.replace('&','&amp;'))+'</i>'; }
    el.innerHTML=h;
  }
  function toKsh(el){
    var k=el.__de!==undefined?null:key(el);
    if(k===null) return;
    var v=DICT[k]; if(v===undefined) return;
    el.__de=el.innerHTML;
    if(k.indexOf('W:')===0) buildWord(el,v); else el.innerHTML=v;
  }
  function toDe(el){ if(el.__de!==undefined){ el.innerHTML=el.__de; delete el.__de; } }
  function attrs(on){
    ATTRS.forEach(function(a){
      [].forEach.call(document.querySelectorAll('['+a+']'),function(el){
        var da='data-de-'+a;
        if(on){ var v=el.getAttribute(a); if(!el.hasAttribute(da)&&DICT['@'+v]!==undefined){ el.setAttribute(da,v); el.setAttribute(a,DICT['@'+v]); } }
        else if(el.hasAttribute(da)){ el.setAttribute(a,el.getAttribute(da)); el.removeAttribute(da); }
      });
    });
    if(on){ if(DICT['@title']&&document.__deTitle===undefined){ document.__deTitle=document.title; } var t=DICT['@@'+document.title]; if(t){ document.__deTitle=document.title; document.title=t; } }
    else if(document.__deTitle!==undefined){ document.title=document.__deTitle; document.__deTitle=undefined; }
  }
  function apply(){
    if(applying) return; applying=true;
    try{
      document.documentElement.lang = lang==='ksh' ? 'ksh' : 'de';
      var els=[]; collect(document.body,els);
      if(lang==='ksh'){ els.forEach(toKsh); attrs(true); }
      else { [].forEach.call(document.querySelectorAll('*'),function(e){ if(e.__de!==undefined) toDe(e); }); attrs(false); }
      [].forEach.call(document.querySelectorAll('[data-lang]'),function(b){ var on=b.getAttribute('data-lang')===lang; b.setAttribute('aria-pressed',on?'true':'false'); b.classList.toggle('on',on); });
    }finally{ applying=false; }
  }
  function set(l){ lang=l; try{ localStorage.setItem(KEY,l); }catch(e){} apply(); }
  var q=(location.search.match(/[?&]lang=(de|ksh)/)||[])[1];
  var saved; try{ saved=localStorage.getItem(KEY); }catch(e){}
  lang=q||saved||'ksh';
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-lang]'); if(b){ e.preventDefault(); set(b.getAttribute('data-lang')); } });
  var t=0;
  function later(){ if(lang!=='ksh'||applying) return; clearTimeout(t); t=setTimeout(apply,120); }
  function init(){ apply(); mo=new MutationObserver(later); mo.observe(document.body,{childList:true,subtree:true,characterData:true}); }
  window.kgbI18n={collect:function(){var o=[];collect(document.body,o);return o.map(function(e){return key(e);});},attrs:function(){var r=[];ATTRS.forEach(function(a){[].forEach.call(document.querySelectorAll('['+a+']'),function(e){r.push('@'+e.getAttribute(a));});});r.push('@@'+document.title);return r;},set:set};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
