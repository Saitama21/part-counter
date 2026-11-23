'use strict';
// Kiosk-style touch surface: prevent page zoom and text selection.
for(const type of ['gesturestart','gesturechange','gestureend']){
  document.addEventListener(type,e=>e.preventDefault(),{passive:false});
}
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
document.addEventListener('dblclick',e=>e.preventDefault());
document.addEventListener('selectstart',e=>e.preventDefault());
const K='production-center-v1';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
let s=load(),timer;
function valid(n){return Number.isSafeInteger(n)&&n>0&&n<=99999999}
function load(){
  try{
    const a=JSON.parse(localStorage.getItem(K)||'{}');
    return {plan:valid(a.plan)?a.plan:null,done:Number.isSafeInteger(a.done)&&a.done>=0?Math.min(a.done,99999999):0,history:Array.isArray(a.history)?a.history.slice(0,100):[],vibrate:a.vibrate!==false};
  }catch{return {plan:null,done:0,history:[],vibrate:true}}
}
function save(){try{localStorage.setItem(K,JSON.stringify(s))}catch{notice('Не удалось сохранить данные')}}
function metrics(){return {pct:s.plan?Math.min(100,100*s.done/s.plan):0,left:s.plan?Math.max(0,s.plan-s.done):0,extra:s.plan?Math.max(0,s.done-s.plan):0}}
const ring=[],bar=[];
function arcPoint(cx,cy,r,deg){const t=deg*Math.PI/180;return [cx+r*Math.cos(t),cy+r*Math.sin(t)]}
function brick(i){
  const step=360/32,gap=1.6,a=-90+i*step+gap/2,b=-90+(i+1)*step-gap/2;
  const p=arcPoint(145,135,127,a),q=arcPoint(145,135,127,b),u=arcPoint(145,135,108,b),v=arcPoint(145,135,108,a);
  return 'M'+p.join(' ')+' A127 127 0 0 1 '+q.join(' ')+' L'+u.join(' ')+' A108 108 0 0 0 '+v.join(' ')+' Z';
}
for(let i=0;i<32;i++){
  const p=document.createElementNS(NS,'path');p.setAttribute('d',brick(i));p.setAttribute('class','ring-segment');$('ringSegments').append(p);ring.push(p);
}
for(let i=0;i<20;i++){const d=document.createElement('span');d.className='bar-segment';$('barSegments').append(d);bar.push(d)}
function render(updateInput=true){
  const m=metrics();
  if(updateInput)$('plan').value=s.plan??'';
  $('done').textContent=s.done;
  $('pct').textContent=Math.round(m.pct)+'%';
  $('remaining').textContent=m.left;
  $('reserve').textContent='+'+m.extra;
  $('ring').setAttribute('aria-label',Math.round(m.pct)+'% плана');
  const nr=Math.round(m.pct*32/100),nb=Math.round(m.pct*20/100);
  ring.forEach((x,i)=>x.classList.toggle('on',i<nr));
  bar.forEach((x,i)=>x.classList.toggle('on',i<nb));
  $('minus').disabled=s.done===0;
}
function change(delta){
  s.done=Math.max(0,Math.min(99999999,s.done+delta));
  save();render();
  if(s.vibrate&&navigator.vibrate)navigator.vibrate(12);
}
function notice(t){
  $('message').textContent=t;
  $('message').classList.add('visible');
  clearTimeout(timer);
  timer=setTimeout(()=>$('message').classList.remove('visible'),1800);
}
// Keep tactile feedback visible briefly even after a quick iOS tap.
function installPressFeedback(button){
  const MIN_PRESS_MS=135;
  let pressedAt=0,releaseTimer=0;
  const start=()=>{
    if(button.disabled)return;
    clearTimeout(releaseTimer);
    pressedAt=performance.now();
    button.classList.add('is-pressed');
  };
  const end=()=>{
    if(!button.classList.contains('is-pressed'))return;
    clearTimeout(releaseTimer);
    const remaining=Math.max(0,MIN_PRESS_MS-(performance.now()-pressedAt));
    releaseTimer=setTimeout(()=>button.classList.remove('is-pressed'),remaining);
  };
  button.addEventListener('pointerdown',start);
  button.addEventListener('pointerup',end);
  button.addEventListener('pointercancel',end);
  button.addEventListener('pointerleave',end);
  button.addEventListener('blur',end);
  button.addEventListener('click',()=>{
    if(!button.classList.contains('is-pressed')){start();end()}
  });
}
['plus','minus'].forEach(id=>installPressFeedback($(id)));
['09_minus_button_pressed.png','10_plus_button_pressed.png'].forEach(src=>{
  const img=new Image();
  img.src='./'+src;
});
$('plus').addEventListener('click',()=>change(1));
$('minus').addEventListener('click',()=>change(-1));
$('plan').addEventListener('input',e=>{
  const value=e.target.value.trim(),n=Number(value);
  s.plan=value!==''&&valid(n)?n:null;save();render(false);
});
$('plan').addEventListener('blur',()=>render());
$('planUp').addEventListener('click',()=>{s.plan=Math.min(99999999,(s.plan||0)+1);save();render()});
$('planDown').addEventListener('click',()=>{s.plan=Math.max(1,(s.plan||1)-1);save();render()});
function modal(title,body,acts){
  $('modalTitle').textContent=title;$('modalBody').replaceChildren();
  if(typeof body==='string')$('modalBody').textContent=body;
  else $('modalBody').append(body);
  $('modalActions').replaceChildren();
  acts.forEach(a=>{
    const b=document.createElement('button');b.textContent=a.text;
    if(a.danger)b.className='danger';
    b.addEventListener('click',()=>{$('modal').close();if(a.act)a.act()});
    $('modalActions').append(b);
  });
  if(!$('modal').open)$('modal').showModal();
}
const cancel={text:'Отмена'};
$('reset').addEventListener('click',()=>modal('Сбросить счётчик?','Количество готовых деталей станет нулём. План останется прежним.',[cancel,{text:'Сбросить',danger:true,act(){s.done=0;save();render();notice('Счётчик обнулён')}}]));
$('newBatch').addEventListener('click',()=>modal('Новая партия?','Текущая партия сохранится в истории. План и готовые детали станут нулевыми.',[cancel,{text:'Создать',act(){
  if(s.plan||s.done)s.history.unshift({time:new Date().toISOString(),plan:s.plan,done:s.done});
  s.history=s.history.slice(0,100);s.plan=null;s.done=0;save();render();notice('Новая партия');
}}]));
$('history').addEventListener('click',()=>{
  const d=document.createElement('div');
  if(!s.history.length)d.textContent='Завершённых партий пока нет';
  else{
    const ul=document.createElement('ul');
    s.history.forEach(x=>{
      const li=document.createElement('li');
      const date=new Date(x.time),txt=Number.isNaN(date.getTime())?'Дата не указана':date.toLocaleString('ru-RU');
      li.textContent=txt+' · план '+(x.plan??'—')+' · готово '+x.done+' · запас +'+(x.plan?Math.max(0,x.done-x.plan):0);ul.append(li);
    });d.append(ul);
  }
  modal('История партий',d,[{text:'Закрыть'}]);
});
$('settings').addEventListener('click',()=>{
  const d=document.createElement('div'),l=document.createElement('label'),c=document.createElement('input');
  c.type='checkbox';c.checked=s.vibrate;c.addEventListener('change',()=>{s.vibrate=c.checked;save()});
  l.append(c,document.createTextNode(' Виброотклик'));d.append(l);
  const p=document.createElement('p');p.className='muted';p.textContent='Данные сохраняются локально на устройстве. Офлайн после первого открытия по HTTPS. История хранится только в этом браузере.';d.append(p);
  modal('Настройки',d,[{text:'Готово'}]);
});
render();
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))
  addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>notice('Офлайн-режим недоступен')));
