(() => {
'use strict';
const params=new URLSearchParams(location.search);
let language=params.get('lang')==='en'?'en':'es';
if(!params.has('lang')){try{language=localStorage.getItem('glhf:language')==='en'?'en':'es';}catch{}}
function setLanguage(lang){
 language=lang==='en'?'en':'es';document.documentElement.lang=language;
 document.querySelectorAll('[data-legal-lang]').forEach(node=>{node.hidden=node.dataset.legalLang!==language;});
 document.querySelectorAll('[data-switch-lang]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.switchLang===language)));
 document.querySelectorAll('[data-home-link]').forEach(anchor=>anchor.href='index.html#inicio');
 document.title=(document.body.dataset.page==='privacy'?(language==='en'?'Privacy':'Privacidad'):(language==='en'?'Policies':'Políticas'))+' | GLHF';
 const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url.href);
 try{localStorage.setItem('glhf:language',language);}catch{}
}
document.querySelectorAll('[data-switch-lang]').forEach(button=>button.addEventListener('click',()=>{setLanguage(button.dataset.switchLang);button.focus();}));
setLanguage(language);
})();
