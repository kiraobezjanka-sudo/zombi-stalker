'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };
type Mode = 'wander' | 'investigate' | 'chase' | 'search' | 'attack';
type Result = 'playing' | 'won' | 'lost';

const MAP = [
  '########################',
  '#.....#.....#..........#',
  '#.....#.....#..........#',
  '#......................#',
  '###.######.######.######',
  '#......................#',
  '#....#.......#.........#',
  '#....#.......#.........#',
  '#......................#',
  '######.######.######.###',
  '#......................#',
  '#......#......#........#',
  '#......#......#........#',
  '#......................#',
  '########################',
];
const W = MAP[0].length, H = MAP.length;
const START = { x: 2, y: 2 }, ZOMBIE = { x: 20, y: 12 }, EXIT = { x: 22, y: 13 };
const FILES = [{ x: 10, y: 1 }, { x: 19, y: 2 }, { x: 3, y: 12 }];
const labels: Record<Mode, string> = {
  wander: 'Бродит', investigate: 'Проверяет шум', chase: 'Преследует', search: 'Ищет', attack: 'Атакует',
};
const rules: Record<Mode, string> = {
  wander: 'Игрок не обнаружен → зомби бродит по участку.',
  investigate: 'Зомби слышит шум → идёт к его источнику.',
  chase: 'Игрок попал в поле зрения → начинается погоня.',
  search: 'Зомби потерял игрока → проверяет последнее известное место.',
  attack: 'Зомби догнал игрока → пытается укусить.',
};
const eq = (a: Point | null, b: Point | null) => !!a && !!b && a.x === b.x && a.y === b.y;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const walkable = (p: Point) => p.x >= 0 && p.y >= 0 && p.x < W && p.y < H && MAP[p.y][p.x] !== '#';
const around = (p: Point) => [[1,0],[-1,0],[0,1],[0,-1]].map(([x,y]) => ({x:p.x+x,y:p.y+y})).filter(walkable);
const key = (p: Point) => `${p.x},${p.y}`;

function pathTo(start: Point, goal: Point | null) {
  if (!goal || !walkable(goal)) return [];
  const queue = [start], prev = new Map<string, Point | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (eq(current, goal)) break;
    for (const next of around(current)) if (!prev.has(key(next))) {
      prev.set(key(next), current); queue.push(next);
    }
  }
  if (!prev.has(key(goal))) return [];
  const path: Point[] = []; let current: Point | null = goal;
  while (current && !eq(current, start)) { path.push(current); current = prev.get(key(current)) ?? null; }
  return path.reverse();
}

function clearLine(a: Point, b: Point) {
  let x=a.x, y=a.y, dx=Math.abs(b.x-x), dy=-Math.abs(b.y-y);
  const sx=x<b.x?1:-1, sy=y<b.y?1:-1; let err=dx+dy;
  while (true) {
    if (MAP[y][x] === '#') return false;
    if (x === b.x && y === b.y) return true;
    const e=err*2; if (e>=dy) { err+=dy; x+=sx; } if (e<=dx) { err+=dx; y+=sy; }
  }
}

function randomFloor() {
  const cells: Point[] = [];
  MAP.forEach((row,y) => [...row].forEach((tile,x) => tile !== '#' && cells.push({x,y})));
  return cells[Math.floor(Math.random()*cells.length)];
}

export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null), keys = useRef(new Set<string>());
  const game = useRef({
    player:{...START}, zombie:{...ZOMBIE}, mode:'wander' as Mode, target:randomFloor() as Point|null,
    path:[] as Point[], pathTarget:null as Point|null, lastSeen:null as Point|null,
    noise:null as {point:Point; time:number}|null, found:new Set<number>(), hp:3, result:'playing' as Result,
    paused:false, modeAt:0, playerAt:0, zombieAt:0, attackAt:0, flashUntil:0,
  });
  const [mode,setMode] = useState<Mode>('wander'), [hp,setHp] = useState(3);
  const [found,setFound] = useState(0), [result,setResult] = useState<Result>('playing');
  const [paused,setPaused] = useState(false);

  const changeMode = useCallback((next:Mode, target?:Point|null) => {
    const g=game.current;
    if (g.mode!==next) { g.mode=next; g.modeAt=performance.now(); setMode(next); }
    if (target!==undefined) g.target=target ? {...target} : null;
    g.path=[]; g.pathTarget=null;
  },[]);

  const move = useCallback((dx:number,dy:number,sprint=false) => {
    const g=game.current; if (g.paused || g.result!=='playing') return;
    const next={x:g.player.x+dx,y:g.player.y+dy}; if (!walkable(next)) return;
    g.player=next;
    FILES.forEach((file,i) => { if (eq(file,next) && !g.found.has(i)) { g.found.add(i); setFound(g.found.size); } });
    if (eq(next,EXIT) && g.found.size===FILES.length) { g.result='won'; setResult('won'); }
    if (sprint) g.noise={point:{...next},time:performance.now()};
  },[]);

  const noise = useCallback(() => {
    const g=game.current; if (g.paused || g.result!=='playing') return;
    g.noise={point:{...g.player},time:performance.now()};
    if (g.mode!=='chase' && dist(g.zombie,g.player)<=10) changeMode('investigate',g.player);
  },[changeMode]);

  const pause = () => { const g=game.current; g.paused=!g.paused; setPaused(g.paused); };
  const restart = () => {
    const g=game.current;
    Object.assign(g,{player:{...START},zombie:{...ZOMBIE},mode:'wander',target:randomFloor(),path:[],pathTarget:null,
      lastSeen:null,noise:null,found:new Set<number>(),hp:3,result:'playing',paused:false,modeAt:performance.now(),
      playerAt:0,zombieAt:0,attackAt:0,flashUntil:0});
    setMode('wander'); setHp(3); setFound(0); setResult('playing'); setPaused(false);
  };

  useEffect(() => {
    const down=(e:KeyboardEvent) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      keys.current.add(e.key.toLowerCase());
      if (e.code==='Space' && !e.repeat) noise();
      if (e.key.toLowerCase()==='p' && !e.repeat) pause();
    };
    const up=(e:KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown',down,{passive:false}); window.addEventListener('keyup',up);
    return () => { window.removeEventListener('keydown',down); window.removeEventListener('keyup',up); };
  },[noise]);

  useEffect(() => {
    const el=canvas.current, ctx=el?.getContext('2d'); if (!el || !ctx) return;
    let frame=0;
    const sees=() => { const g=game.current; return dist(g.zombie,g.player)<=7.2 && clearLine(g.zombie,g.player); };
    const updatePlayer=(now:number) => {
      const g=game.current, held=keys.current, sprint=held.has('shift');
      if (now-g.playerAt < (sprint?92:145)) return;
      let d:[number,number]|null=null;
      if (held.has('arrowup')||held.has('w')||held.has('ц')) d=[0,-1];
      else if (held.has('arrowdown')||held.has('s')||held.has('ы')) d=[0,1];
      else if (held.has('arrowleft')||held.has('a')||held.has('ф')) d=[-1,0];
      else if (held.has('arrowright')||held.has('d')||held.has('в')) d=[1,0];
      if (d) { move(...d,sprint); g.playerAt=now; }
    };
    const updateZombie=(now:number) => {
      const g=game.current;
      if (sees()) { g.lastSeen={...g.player}; changeMode('chase',g.player); }
      else if (g.mode==='chase') changeMode('search',g.lastSeen);
      else if (g.noise && now-g.noise.time<1800 && dist(g.zombie,g.noise.point)<=10 && g.mode==='wander') changeMode('investigate',g.noise.point);
      if (g.mode==='wander' && eq(g.zombie,g.target)) g.target=randomFloor();
      if (g.mode==='investigate' && eq(g.zombie,g.target)) { g.lastSeen=g.target; changeMode('search',g.target); }
      if (g.mode==='search' && now-g.modeAt>4800) changeMode('wander',randomFloor());
      if (g.mode==='chase') g.target={...g.player};
      if (dist(g.zombie,g.player)<=1.05 && now>g.attackAt) {
        changeMode('attack',g.player); g.attackAt=now+1450; g.flashUntil=now+250; g.hp-=1; setHp(g.hp);
        if (g.hp<=0) { g.result='lost'; setResult('lost'); return; }
      } else if (g.mode==='attack' && now+800<g.attackAt) return;
      else if (g.mode==='attack') sees()?changeMode('chase',g.player):changeMode('search',g.lastSeen);
      const delay=g.mode==='chase'?265:430; if (now-g.zombieAt<delay) return;
      if (!eq(g.pathTarget,g.target)||!g.path.length) { g.path=pathTo(g.zombie,g.target); g.pathTarget=g.target?{...g.target}:null; }
      const next=g.path.shift(); if (next) g.zombie=next; g.zombieAt=now;
    };
    const draw=(now:number) => {
      const box=el.getBoundingClientRect(), ratio=Math.min(devicePixelRatio||1,2), width=Math.max(300,box.width), height=Math.max(280,box.height);
      if (el.width!==Math.round(width*ratio)||el.height!==Math.round(height*ratio)) { el.width=Math.round(width*ratio); el.height=Math.round(height*ratio); }
      ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,width,height);
      const cell=Math.min(width/W,height/H), ox=(width-cell*W)/2, oy=(height-cell*H)/2, css=getComputedStyle(document.documentElement);
      const color=(name:string)=>css.getPropertyValue(name).trim(), g=game.current;
      MAP.forEach((row,y)=>[...row].forEach((tile,x)=>{
        ctx.fillStyle=tile==='#'?color('--wall'):((x+y)%2?color('--floor-a'):color('--floor-b'));
        ctx.fillRect(ox+x*cell,oy+y*cell,cell+.5,cell+.5);
        if(tile==='#'){ctx.strokeStyle=color('--wall-edge');ctx.lineWidth=1;ctx.strokeRect(ox+x*cell+1,oy+y*cell+1,cell-2,cell-2);}
      }));
      const pos=(p:Point)=>({x:ox+(p.x+.5)*cell,y:oy+(p.y+.5)*cell});
      const exit=pos(EXIT); ctx.fillStyle=color('--exit');ctx.fillRect(exit.x-cell*.32,exit.y-cell*.38,cell*.64,cell*.76);
      ctx.fillStyle=color('--dark');ctx.font=`700 ${Math.max(8,cell*.22)}px Arial`;ctx.textAlign='center';ctx.fillText('EXIT',exit.x,exit.y+cell*.07);
      FILES.forEach((file,i)=>{if(g.found.has(i))return;const p=pos(file);ctx.fillStyle=color('--evidence');ctx.fillRect(p.x-cell*.2,p.y-cell*.27,cell*.4,cell*.54);ctx.strokeStyle=color('--dark');ctx.strokeRect(p.x-cell*.2,p.y-cell*.27,cell*.4,cell*.54);});
      if(g.noise&&now-g.noise.time<1800){const p=pos(g.noise.point),t=(now-g.noise.time)/1800;ctx.globalAlpha=1-t;ctx.strokeStyle=color('--noise');ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,cell*(.4+t*2),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      if(g.mode==='chase'){const p=pos(g.zombie);ctx.globalAlpha=.15;ctx.fillStyle=color('--danger');ctx.beginPath();ctx.arc(p.x,p.y,cell*1.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      const actor=(point:Point,fill:string,zombie=false)=>{const p=pos(point);ctx.fillStyle=color(fill);ctx.beginPath();ctx.arc(p.x,p.y,cell*.34,0,Math.PI*2);ctx.fill();ctx.fillStyle=color('--dark');ctx.beginPath();ctx.arc(p.x-cell*.1,p.y-cell*.06,Math.max(1.5,cell*.05),0,Math.PI*2);ctx.arc(p.x+cell*.1,p.y-cell*.06,Math.max(1.5,cell*.05),0,Math.PI*2);ctx.fill();if(zombie){ctx.strokeStyle=color('--dark');ctx.beginPath();ctx.moveTo(p.x-cell*.12,p.y+cell*.1);ctx.lineTo(p.x+cell*.13,p.y+cell*.07);ctx.stroke();}};
      actor(g.player,'--player');actor(g.zombie,'--zombie',true);
      if(now<g.flashUntil){ctx.globalAlpha=.28;ctx.fillStyle=color('--danger');ctx.fillRect(ox,oy,cell*W,cell*H);ctx.globalAlpha=1;}
    };
    const loop=(now:number)=>{const g=game.current;if(!g.paused&&g.result==='playing'){updatePlayer(now);updateZombie(now);}draw(now);frame=requestAnimationFrame(loop);};
    frame=requestAnimationFrame(loop); return()=>cancelAnimationFrame(frame);
  },[changeMode,move]);

  return <main className="shell">
    <header><div><p className="eyebrow">R.P.D. · Ночная смена</p><h1>Последний протокол</h1></div><div className={`state ${mode}`}><i/><span><small>Зомби</small><strong>{labels[mode]}</strong></span></div></header>
    <section className="hud"><div><small>Здоровье</small><div className="hearts">{[0,1,2].map(n=><b className={n<hp?'live':''} key={n}>♥</b>)}</div></div><div className="mission"><small>Задача</small><strong>Найти улики и выйти</strong></div><div className="files"><small>Улики</small><strong>{found} / {FILES.length}</strong></div></section>
    <section className="board"><canvas ref={canvas}/>{(paused||result!=='playing')&&<div className="overlay"><p className="eyebrow">{paused?'Игра приостановлена':result==='won'?'Эвакуация успешна':'Смена окончена'}</p><h2>{paused?'Пауза':result==='won'?'Вы выбрались':'Зомби вас поймал'}</h2><p>{paused?'Зомби тоже ждёт.':result==='won'?'Все улики доставлены.':'Попробуйте отвлечь его шумом.'}</p><button onClick={paused?pause:restart}>{paused?'Продолжить':'Начать заново'}</button></div>}</section>
    <section className="deck"><div className="rule"><i className={mode}>{mode==='chase'||mode==='attack'?'!':'?'}</i><div><small>Активное правило</small><p>{rules[mode]}</p></div></div><div className="actions"><div className="dpad"><button className="up" onClick={()=>move(0,-1)}>↑</button><button className="left" onClick={()=>move(-1,0)}>←</button><button className="down" onClick={()=>move(0,1)}>↓</button><button className="right" onClick={()=>move(1,0)}>→</button></div><button className="noise" onClick={noise}>◉ Создать шум <kbd>Space</kbd></button><button className="pause" onClick={pause} aria-label="Пауза">{paused?'▶':'Ⅱ'}</button></div></section>
    <footer><span><kbd>WASD</kbd> движение</span><span><kbd>Shift</kbd> бег и шум</span><span><kbd>Space</kbd> отвлечь</span><em>Выход откроется после 3 улик</em></footer>
  </main>;
}
