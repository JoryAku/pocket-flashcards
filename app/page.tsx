"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Term = { id:string; term:string; description:string; points:number; attempts:number; correct:number; streak:number; bestStreak:number; flashcardExposures:number; wordBankRounds:number; reviewRounds:number };
type StudySet = { id:string; title:string; terms:Term[]; lifetimePoints:number; wordBankUnlocked:boolean; reviewUnlocked:boolean; createdAt:string; updatedAt:string };
type View = { kind:"library" } | { kind:"set"; id:string } | { kind:"study"; id:string; stage:"flash"|"bank"|"review" };

const uid = () => crypto.randomUUID();
const makeTerm = (term:string, description:string):Term => ({id:uid(),term,description,points:0,attempts:0,correct:0,streak:0,bestStreak:0,flashcardExposures:0,wordBankRounds:0,reviewRounds:0});
const seed:StudySet[] = [
  {id:"spanish",title:"Spanish essentials",lifetimePoints:230,wordBankUnlocked:true,reviewUnlocked:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),terms:[
    {...makeTerm("la ventana","window"),flashcardExposures:4,wordBankRounds:3,reviewRounds:2,points:70,attempts:5,correct:5,streak:5,bestStreak:5},
    {...makeTerm("el jardín","garden"),flashcardExposures:4,wordBankRounds:3,reviewRounds:1,points:60,attempts:4,correct:4,streak:4,bestStreak:4},
    {...makeTerm("la llave","key"),flashcardExposures:4,wordBankRounds:3,points:50,attempts:3,correct:3,streak:3,bestStreak:3},
    {...makeTerm("despacio","slowly"),flashcardExposures:4,wordBankRounds:3,points:50,attempts:3,correct:3,streak:3,bestStreak:3} ]},
  {id:"botany",title:"Backyard botany",lifetimePoints:0,wordBankUnlocked:false,reviewUnlocked:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),terms:[makeTerm("Petiole","The stalk joining a leaf to a stem"),makeTerm("Sepal","A leaf-like part protecting a flower bud"),makeTerm("Rhizome","A horizontal underground plant stem")]},
];

const completion = (t:Term) => Math.round((
  Math.min(t.flashcardExposures,4)/4+
  Math.min(t.wordBankRounds,3)/3+
  Math.min(t.reviewRounds,3)/3
)/3*100);
const completed = (s:StudySet) => s.terms.filter(t=>completion(t)===100).length;
const stageFor = (s:StudySet):"flash"|"bank"|"review" => s.terms.some(t=>t.flashcardExposures<4)?"flash":s.terms.some(t=>t.wordBankRounds<3)?"bank":"review";
const normalizeAnswer = (value:string) => value.normalize("NFC").trim().toLocaleLowerCase();
const makeCloze = (value:string, fraction:number, seed:string) => {
  const characters=Array.from(value);
  const candidates=characters.map((character,index)=>({character,index})).filter(({character})=>/[\p{L}\p{N}]/u.test(character));
  let state=Array.from(seed).reduce((hash,character)=>(hash*31+character.codePointAt(0)!)>>>0,2166136261);
  const shuffled=[...candidates].sort(()=>{state=(state*1664525+1013904223)>>>0;return (state/4294967296)-0.5});
  const hidden=new Set(shuffled.slice(0,Math.max(1,Math.ceil(candidates.length*fraction))).map(({index})=>index));
  return {masked:characters.map((character,index)=>hidden.has(index)?"_":character).join(""),missing:characters.filter((_,index)=>hidden.has(index)).join("")};
};
const makeLetterBank = (value:string, seed:string) => {
  const letters=Array.from(value).map((letter,index)=>({letter,index}));
  let state=Array.from(seed).reduce((hash,character)=>(hash*33+character.codePointAt(0)!)>>>0,5381);
  for(let index=letters.length-1;index>0;index--){state=(state*1664525+1013904223)>>>0;const target=Math.floor((state/4294967296)*(index+1));[letters[index],letters[target]]=[letters[target],letters[index]]}
  return letters;
};
const safeSets = (value:unknown):StudySet[] => {
  const raw = Array.isArray(value)?value:[value];
  if(!raw.length) throw new Error("No study sets found");
  return raw.map(candidate=>{
    if(!candidate || typeof candidate!=="object") throw new Error("That file is not a Pocket Flashcards backup");
    const x=candidate as Record<string,unknown>;
    if(!x || typeof x.title!=="string" || !Array.isArray(x.terms)) throw new Error("That file is not a Pocket Flashcards backup");
    const now=new Date().toISOString();
    let terms=x.terms.map(candidateTerm=>{
      const t=candidateTerm && typeof candidateTerm==="object"?candidateTerm as Record<string,unknown>:{};
      return {...makeTerm(String(t.term||""),String(t.description||"")),points:Number(t.points)||0,attempts:Number(t.attempts)||0,correct:Number(t.correct)||0,streak:Number(t.streak)||0,bestStreak:Number(t.bestStreak)||0,flashcardExposures:Math.min(4,Number(t.flashcardExposures)||0),wordBankRounds:Math.min(3,Number(t.wordBankRounds)||0),reviewRounds:Math.min(3,Number(t.reviewRounds)||0)};
    });
    const isOldSpanishExample=x.title==="Spanish essentials"&&terms.map((t:Term)=>t.term).join("|")==="la ventana|el jardín|la llave|despacio"&&terms.map((t:Term)=>`${t.flashcardExposures}-${t.wordBankRounds}-${t.reviewRounds}`).join("|")==="4-3-2|4-2-0|0-0-0|0-0-0";
    if(isOldSpanishExample) terms=seed[0].terms.map(t=>({...t,id:uid()}));
    const allFlash=terms.length>0&&terms.every((t:Term)=>t.flashcardExposures>=4);
    const allBank=terms.length>0&&terms.every((t:Term)=>t.wordBankRounds>=3);
    return {id:uid(),title:x.title.trim()||"Imported set",lifetimePoints:terms.reduce((sum:number,t:Term)=>sum+t.points,0),wordBankUnlocked:Boolean(x.wordBankUnlocked)||allFlash||terms.some((t:Term)=>t.wordBankRounds>0||t.reviewRounds>0),reviewUnlocked:Boolean(x.reviewUnlocked)||allBank||terms.some((t:Term)=>t.reviewRounds>0),createdAt:x.createdAt||now,updatedAt:now,terms};
  });
};

export default function Home(){
  const [sets,setSets]=useState<StudySet[]>([]); const [ready,setReady]=useState(false); const [view,setView]=useState<View>({kind:"library"});
  const [modal,setModal]=useState<null|"new"|"rename"|"delete"|"term"|"reset-review"|"reset-term">(null); const [draft,setDraft]=useState(""); const [desc,setDesc]=useState(""); const [editId,setEditId]=useState<string|null>(null); const [notice,setNotice]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  // Browser storage is intentionally restored only after server hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{try{const saved=localStorage.getItem("pocket-flashcards-v1");setSets(saved?safeSets(JSON.parse(saved)):seed)}catch{setSets(seed)}setReady(true)},[]);
  useEffect(()=>{if(ready)localStorage.setItem("pocket-flashcards-v1",JSON.stringify(sets))},[sets,ready]);
  const active=view.kind!=="library"?sets.find(s=>s.id===view.id):undefined;
  const update=(id:string,fn:(s:StudySet)=>StudySet)=>setSets(xs=>xs.map(s=>{if(s.id!==id)return s;const next=fn(s);const allFlash=next.terms.length>0&&next.terms.every(t=>t.flashcardExposures>=4);const allBank=next.terms.length>0&&next.terms.every(t=>t.wordBankRounds>=3);return {...next,wordBankUnlocked:next.wordBankUnlocked||allFlash,reviewUnlocked:next.reviewUnlocked||allBank,updatedAt:new Date().toISOString()}}));
  const toast=(s:string)=>{setNotice(s);setTimeout(()=>setNotice(""),2600)};
  const createSet=()=>{if(!draft.trim())return;const now=new Date().toISOString();const n:StudySet={id:uid(),title:draft.trim(),terms:[],lifetimePoints:0,wordBankUnlocked:false,reviewUnlocked:false,createdAt:now,updatedAt:now};setSets(x=>[n,...x]);setModal(null);setDraft("");setView({kind:"set",id:n.id})};
  const exportSet=(s:StudySet)=>{const blob=new Blob([JSON.stringify(s,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${s.title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.json`;a.click();URL.revokeObjectURL(a.href);toast("Backup downloaded")};
  const importFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;try{const incoming=safeSets(JSON.parse(await f.text()));setSets(x=>[...incoming,...x]);toast(`${incoming.length} set${incoming.length>1?"s":""} imported`)}catch(err){toast(err instanceof Error?err.message:"Could not import file")}e.target.value=""};
  const saveTerm=()=>{if(!active||!draft.trim()||!desc.trim())return;update(active.id,s=>({...s,terms:editId?s.terms.map(t=>t.id===editId?{...t,term:draft.trim(),description:desc.trim()}:t):[...s.terms,makeTerm(draft.trim(),desc.trim())]}));setModal(null);setDraft("");setDesc("");setEditId(null)};
  const resetReview=()=>{if(!active)return;update(active.id,s=>{const terms=s.terms.map(t=>{const completedReviews=Math.min(3,t.reviewRounds);return {...t,points:Math.max(0,t.points-completedReviews*10),attempts:Math.max(0,t.attempts-completedReviews),correct:Math.max(0,t.correct-completedReviews),streak:0,reviewRounds:0}});return {...s,terms,lifetimePoints:terms.reduce((sum,t)=>sum+t.points,0)}});setModal(null);toast("Term review progress reset")};
  const resetTerm=()=>{if(!active||!editId)return;update(active.id,s=>{const terms=s.terms.map(t=>t.id===editId?{...t,points:0,attempts:0,correct:0,streak:0,bestStreak:0,flashcardExposures:0,wordBankRounds:0,reviewRounds:0}:t);return {...s,terms,lifetimePoints:terms.reduce((sum,t)=>sum+t.points,0)}});setModal(null);setEditId(null);toast(`${draft} progress reset`)};
  if(!ready)return <main className="loading">Opening your study drawer…</main>;
  return <div className="app">
    <header><button className="brand" onClick={()=>setView({kind:"library"})} aria-label="Pocket Flashcards home"><span className="mark">P</span><span>Pocket<br/>Flashcards</span></button><div className="privacy">Review <span>· Rinse · Repeat</span></div></header>
    {view.kind==="library"&&<Library sets={sets} open={id=>setView({kind:"set",id})} onNew={()=>{setDraft("");setModal("new")}} onImport={()=>fileRef.current?.click()} rename={s=>{setEditId(s.id);setDraft(s.title);setModal("rename")}} remove={s=>{setEditId(s.id);setDraft(s.title);setModal("delete")}} exportSet={exportSet}/>}
    {view.kind==="set"&&active&&<Overview set={active} back={()=>setView({kind:"library"})} study={stage=>setView({kind:"study",id:active.id,stage})} resetReview={()=>setModal("reset-review")} resetTerm={t=>{setEditId(t.id);setDraft(t.term);setModal("reset-term")}} add={()=>{setEditId(null);setDraft("");setDesc("");setModal("term")}} edit={t=>{setEditId(t.id);setDraft(t.term);setDesc(t.description);setModal("term")}} remove={t=>update(active.id,s=>({...s,terms:s.terms.filter(x=>x.id!==t.id)}))}/>}
    {view.kind==="study"&&active&&<Study set={active} stage={view.stage} exit={()=>setView({kind:"set",id:active.id})} update={fn=>update(active.id,fn)}/>}
    <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={importFile}/>
    {modal&&<div className="backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={()=>setModal(null)} aria-label="Close">×</button>
      {modal==="new"&&<><p className="eyebrow">New set</p><h2 id="modal-title">Name your study set</h2><label>Set title<input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder="e.g. Art history" onKeyDown={e=>e.key==="Enter"&&createSet()}/></label><button className="primary wide" onClick={createSet} disabled={!draft.trim()}>Create set <span>→</span></button></>}
      {modal==="rename"&&<><p className="eyebrow">Rename set</p><h2 id="modal-title">Choose a new name</h2><label>Set title<input autoFocus value={draft} onChange={e=>setDraft(e.target.value)}/></label><button className="primary wide" onClick={()=>{if(!editId||!draft.trim())return;update(editId,s=>({...s,title:draft.trim()}));setModal(null)}}>Save name <span>→</span></button></>}
      {modal==="delete"&&<><p className="eyebrow">Please take care</p><h2 id="modal-title">Delete “{draft}”?</h2><p>This removes the set and its progress from this browser. Export it first if you may need it later.</p><div className="modal-actions"><button className="ghost" onClick={()=>setModal(null)}>Keep set</button><button className="danger" onClick={()=>{setSets(x=>x.filter(s=>s.id!==editId));setModal(null)}}>Delete set</button></div></>}
      {modal==="reset-review"&&<><p className="eyebrow">Reset progress</p><h2 id="modal-title">Reset Term Review?</h2><p>This clears all progress and score earned in the third exercise. Flash Cards and Word Bank will stay unchanged.</p><div className="modal-actions"><button className="ghost" onClick={()=>setModal(null)}>Cancel</button><button className="danger" onClick={resetReview}>Reset review</button></div></>}
      {modal==="reset-term"&&<><p className="eyebrow">Reset term</p><h2 id="modal-title">Reset “{draft}”?</h2><p>This clears every exercise, statistic, streak, and score for this term. Other terms will stay unchanged.</p><div className="modal-actions"><button className="ghost" onClick={()=>setModal(null)}>Cancel</button><button className="danger" onClick={resetTerm}>Reset term</button></div></>}
      {modal==="term"&&<><p className="eyebrow">{editId?"Edit term":"New term"}</p><h2 id="modal-title">{editId?"Update this term":"Add a term"}</h2><label>Term<input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder="The word or prompt"/></label><label>Description<textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="The answer or explanation"/></label><button className="primary wide" onClick={saveTerm} disabled={!draft.trim()||!desc.trim()}>{editId?"Save changes":"Add term"} <span>→</span></button></>}
    </section></div>}
    {notice&&<div className="toast" role="status">✓ {notice}</div>}
  </div>
}

function Library({sets,open,onNew,onImport,rename,remove,exportSet}:{sets:StudySet[];open:(id:string)=>void;onNew:()=>void;onImport:()=>void;rename:(s:StudySet)=>void;remove:(s:StudySet)=>void;exportSet:(s:StudySet)=>void}){
  return <main><section className="hero"><div><p className="eyebrow">Pocket Flashcards</p><h1>Review. Rinse.<br/><em>Repeat.</em></h1><p className="lede">Create a set, practise the terms, and track your progress.</p></div><div className="hero-actions"><button className="primary" onClick={onNew}><b>＋</b> New study set</button><button className="ghost" onClick={onImport}>⇩ Import JSON</button></div></section>
  <section className="library"><div className="section-title"><h2>Your study sets</h2><span>{sets.length} {sets.length===1?"collection":"collections"}</span></div>
  {sets.length===0?<div className="empty"><span>✦</span><h3>Your library is waiting.</h3><p>Create a small set and begin with one card at a time.</p><button className="primary" onClick={onNew}>Create your first set</button></div>:<div className="set-grid">{sets.map((s,i)=><article className={`set-card tone-${i%3}`} key={s.id}><div className="set-top"><span className="avatar">{s.title.charAt(0).toUpperCase()}</span><div className="menu"><button aria-label={`Rename ${s.title}`} onClick={()=>rename(s)}>✎</button><button aria-label={`Export ${s.title}`} onClick={()=>exportSet(s)}>↓</button><button aria-label={`Delete ${s.title}`} onClick={()=>remove(s)}>×</button></div></div><button className="card-open" onClick={()=>open(s.id)}><h3>{s.title}</h3><p>{s.terms.length} terms</p><div className="progress-row"><div className="progress"><i style={{width:`${s.terms.length?completed(s)/s.terms.length*100:0}%`}}/></div><span>{completed(s)} complete</span></div><span className="open-label">Open set <b>↗</b></span></button></article>)}</div>}
  </section><Footer/></main>
}

function Overview({set,back,study,resetReview,resetTerm,add,edit,remove}:{set:StudySet;back:()=>void;study:(s:"flash"|"bank"|"review")=>void;resetReview:()=>void;resetTerm:(t:Term)=>void;add:()=>void;edit:(t:Term)=>void;remove:(t:Term)=>void}){
 const allFlash=set.terms.length>0&&set.terms.every(t=>t.flashcardExposures>=4),allBank=set.terms.length>0&&set.terms.every(t=>t.wordBankRounds>=3),wordBankOpen=set.wordBankUnlocked||allFlash,reviewOpen=set.reviewUnlocked||allBank,next=stageFor(set);
 const finished=set.terms.filter(t=>completion(t)===100);const [finishedIndex,setFinishedIndex]=useState(0);const finishedTerm=finished[finishedIndex%Math.max(1,finished.length)];
 return <main><button className="back" onClick={back}>← Back to library</button><section className="set-hero"><div><p className="eyebrow">Study set · {set.terms.length} terms</p><h1>{set.title}</h1><p className="lede">Review your terms and keep progressing.</p></div><div className="points"><small>Score</small><strong>{set.lifetimePoints}</strong><span>5 per exposure · 10 per correct</span></div></section>
 <section className="path"><div className="section-title"><div><p className="eyebrow">Study progress</p><h2>Three stages</h2></div><div className="path-actions">{set.terms.some(t=>t.reviewRounds>0)&&<button className="ghost" onClick={resetReview}>Reset term review</button>}<button className="primary" disabled={!set.terms.length} onClick={()=>study(next)}>Continue studying <span>→</span></button></div></div><div className="stage-grid">
  <Stage n="01" title="Flash cards" copy="Four alternating exposures per term." progress={set.terms.reduce((a,t)=>a+Math.min(t.flashcardExposures,4),0)} total={set.terms.length*4} open={!!set.terms.length} onClick={()=>study("flash")}/>
  <Stage n="02" title="Word bank" copy="Choose the missing answer. Three correct rounds." progress={set.terms.reduce((a,t)=>a+Math.min(t.wordBankRounds,3),0)} total={set.terms.length*3} open={wordBankOpen} onClick={()=>study("bank")}/>
  <Stage n="03" title="Term review" copy="15% hidden, then 50%, then full recall." progress={set.terms.reduce((a,t)=>a+Math.min(t.reviewRounds,3),0)} total={set.terms.length*3} open={reviewOpen} onClick={()=>study("review")}/>
 </div></section>
 {finishedTerm&&<section className="mastered"><div className="section-title"><div><p className="eyebrow">Completed terms</p><h2>Flip through your terms</h2></div><span>{finishedIndex%finished.length+1} of {finished.length}</span></div><article className="mastered-card"><button aria-label="Previous completed term" onClick={()=>setFinishedIndex(index=>(index-1+finished.length)%finished.length)}>←</button><div><p>TERM</p><h3>{finishedTerm.term}</h3><i/><p>DESCRIPTION</p><strong>{finishedTerm.description}</strong></div><button aria-label="Next completed term" onClick={()=>setFinishedIndex(index=>(index+1)%finished.length)}>→</button></article></section>}
 <section className="terms"><div className="section-title"><div><p className="eyebrow">Inside this set</p><h2>Terms & progress</h2></div><button className="ghost" onClick={add}>＋ Add a term</button></div>
 {set.terms.length===0?<div className="empty compact"><span>✦</span><h3>Make your first card.</h3><p>Add a term and description to begin studying.</p></div>:<div className="term-list">{set.terms.map(t=><article className="term-row" key={t.id}><div className="term-copy"><h3>{t.term}</h3><p>{t.description}</p></div><div className="stat"><strong>{t.points}</strong><span>score</span></div><div className="stat"><strong>{t.correct}/{t.attempts}</strong><span>correct</span></div><div className="stat"><strong>{t.bestStreak}</strong><span>best streak</span></div><div className="complete"><strong>{completion(t)}%</strong><div className="progress"><i style={{width:`${completion(t)}%`}}/></div></div><div className="row-actions"><button aria-label={`Reset progress for ${t.term}`} onClick={()=>resetTerm(t)}>↺</button><button aria-label={`Edit ${t.term}`} onClick={()=>edit(t)}>✎</button><button aria-label={`Delete ${t.term}`} onClick={()=>remove(t)}>×</button></div></article>)}</div>}
 </section><Footer/></main>
}

function Stage({n,title,copy,progress,total,open,onClick}:{n:string;title:string;copy:string;progress:number;total:number;open:boolean;onClick:()=>void}){const pct=total?Math.round(progress/total*100):0;return <button className={`stage ${open?"":"locked"}`} disabled={!open} onClick={onClick}><span className="stage-num">{n}</span><span className="stage-state">{open?(pct===100?"Completed":"Ready to practise"):"⌑ Locked"}</span><h3>{title}</h3><p>{copy}</p><div className="progress"><i style={{width:`${pct}%`}}/></div><small>{open?`${progress} of ${total} complete`:"Complete the stage before this one"}</small></button>}

function Study({set,stage,exit,update}:{set:StudySet;stage:"flash"|"bank"|"review";exit:()=>void;update:(f:(s:StudySet)=>StudySet)=>void}){
 const needsStage=(t:Term)=>stage==="flash"?t.flashcardExposures<4:stage==="bank"?t.flashcardExposures>=4&&t.wordBankRounds<3:t.wordBankRounds>=3&&t.reviewRounds<3;
 const eligible=set.terms.filter(needsStage);const [index,setIndex]=useState(0);const [revealed,setRevealed]=useState(false);const [answer,setAnswer]=useState("");const [selectedLetters,setSelectedLetters]=useState<number[]>([]);const [feedback,setFeedback]=useState<null|boolean>(null);const [current,setCurrent]=useState<Term|undefined>(()=>eligible[0]);
 const flip=current?.flashcardExposures%2===1;const title=stage==="flash"?"Flash cards":stage==="bank"?"Word-bank fill-in":"Term review";
 const choices=useMemo(()=>current?[current.term,...set.terms.filter(t=>t.id!==current.id).map(t=>t.term)].slice(0,4).sort((a,b)=>a.localeCompare(b)):[],[current,set.terms]);
 const cloze=useMemo(()=>current&&current.reviewRounds<2?makeCloze(current.term,current.reviewRounds===0?.15:.5,`${current.id}-${current.reviewRounds}`):null,[current]);
 const letterBank=useMemo(()=>{
   if(!cloze||!current)return [];
   const round=current.reviewRounds;
   const fraction=round===0?.15:.5;
   const roundLetters=set.terms.map(term=>makeCloze(term.term,fraction,`${term.id}-${round}`).missing).join("");
   return makeLetterBank(roundLetters,`${set.id}-${round}-bank`);
 },[cloze,current,set.id,set.terms]);
 const reviewExpected=cloze?cloze.missing:current?.term||"";
 const reviewIsCorrect=()=>cloze?normalizeAnswer(answer).replace(/\s/g,"")===normalizeAnswer(reviewExpected).replace(/\s/g,""):normalizeAnswer(answer)===normalizeAnswer(reviewExpected);
 const score=(correct:boolean)=>{if(!current)return;update(s=>({...s,lifetimePoints:s.lifetimePoints+(correct?10:0),terms:s.terms.map(t=>t.id!==current.id?t:{...t,points:t.points+(correct?10:0),attempts:t.attempts+1,correct:t.correct+(correct?1:0),streak:correct?t.streak+1:0,bestStreak:correct?Math.max(t.bestStreak,t.streak+1):t.bestStreak,...(correct?(stage==="bank"?{wordBankRounds:Math.min(3,t.wordBankRounds+1)}:{reviewRounds:Math.min(3,t.reviewRounds+1)}):{})})}));setFeedback(correct)};
 const next=()=>{if(!current)return;const projectedTerms=stage==="flash"?set.terms.map(t=>t.id===current.id?{...t,flashcardExposures:Math.min(4,t.flashcardExposures+1),points:t.points+5}:t):set.terms;if(stage==="flash")update(s=>({...s,lifetimePoints:s.lifetimePoints+5,terms:projectedTerms}));const currentPosition=projectedTerms.findIndex(t=>t.id===current.id);const ordered=[...projectedTerms.slice(currentPosition+1),...projectedTerms.slice(0,currentPosition+1)];const nextTerm=ordered.find(needsStage);setCurrent(nextTerm?{...nextTerm}:undefined);setRevealed(false);setFeedback(null);setAnswer("");setSelectedLetters([]);setIndex(i=>i+1)};
 if(!current)return <main className="study-shell"><button className="back" onClick={exit}>← Set overview</button><div className="study-complete"><span>✦</span><p className="eyebrow">Stage complete</p><h1>Stage complete.</h1><p>Your next study stage is ready.</p><button className="primary" onClick={exit}>Return to your set →</button></div></main>;
 return <main className="study-shell"><div className="study-nav"><button className="back" onClick={exit}>← Leave practice</button><div><span>{title}</span><div className="progress"><i style={{width:`${((index+1)/(eligible.length+index))*100}%`}}/></div></div><strong>✦ {set.lifetimePoints}</strong></div><section className="study-head"><p className="eyebrow">{stage==="flash"?`Exposure ${current.flashcardExposures+1} of 4`:stage==="bank"?`Correct round ${current.wordBankRounds+1} of 3`:`Review ${current.reviewRounds+1} of 3`}</p><h1>{stage==="flash"?"Review the card.":stage==="bank"?"Choose the answer.":"Type the answer."}</h1></section>
 {stage==="flash"?<div className={`flashcard ${revealed?"revealed":""}`}><p>{flip?"DESCRIPTION":"TERM"}</p><h2>{flip?current.description:current.term}</h2><div className="card-divider"/><p>{flip?"TERM":"DESCRIPTION"}</p>{revealed?<h3>{flip?current.term:current.description}</h3>:<button className="reveal" onClick={()=>setRevealed(true)}>Reveal the {flip?"term":"description"} <span>↻</span></button>}</div>:stage==="bank"?<div className="quiz"><div className="prompt"><p>Which term matches this description?</p><h2>{current.description}</h2></div><div className="choices">{choices.map(c=><button key={c} disabled={feedback!==null} className={feedback!==null?(c===current.term?"correct":c===answer?"wrong":""):""} onClick={()=>{setAnswer(c);score(c===current.term)}}>{c}<span>{feedback!==null&&c===current.term?"✓":"○"}</span></button>)}</div></div>:<div className="quiz review"><div className="prompt"><p>{cloze?`${current.reviewRounds===0?"15":"50"}% of the term is hidden`:"Type the complete term"}</p>{cloze&&<h2 className="cloze-term" aria-label="Term with missing letters">{cloze.masked}</h2>}<span className="review-description">{current.description}</span></div>{feedback!==null?<div className="resolved-term"><span>Complete term</span><strong>{current.term}</strong></div>:cloze?<div className="letter-picker"><p>Choose from all missing letters in this round</p><div className="letter-answer" aria-label={`Selected letters: ${answer||"none"}`}>{Array.from(cloze.missing).map((_,position)=><span key={position}>{Array.from(answer)[position]||""}</span>)}</div><div className="letter-bank" aria-label="Missing letter bank">{letterBank.map(({letter,index})=><button key={index} disabled={selectedLetters.includes(index)||selectedLetters.length>=Array.from(cloze.missing).length} onClick={()=>{setSelectedLetters(items=>[...items,index]);setAnswer(value=>value+letter)}} aria-label={`Add letter ${letter}`}>{letter}</button>)}</div><button className="undo-letter" disabled={!selectedLetters.length} onClick={()=>{setSelectedLetters(items=>items.slice(0,-1));setAnswer(value=>Array.from(value).slice(0,-1).join(""))}}>← Undo last letter</button></div>:<label className="answer">Complete term<input autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&answer.trim())score(reviewIsCorrect())}} placeholder="Type the whole term…"/></label>}{feedback===null?<button className="primary" disabled={!answer.trim()||Boolean(cloze&&Array.from(answer).length<Array.from(cloze.missing).length)} onClick={()=>score(reviewIsCorrect())}>Check answer →</button>:<p className={`feedback ${feedback?"good":"bad"}`}>{feedback?"Correct.":"Incorrect."}</p>}</div>}
 <div className="study-footer"><p>{feedback===true?"+10 to your score.":feedback===false?"No score added.":stage==="flash"?"Complete this exposure to add 5 to your score.":"Select an answer to continue."}</p><button className="primary" disabled={stage==="flash"?!revealed:feedback===null} onClick={next}>Next {stage==="flash"?"exposure":"term"} <span>→</span></button></div></main>
}

function Footer(){return <footer><span>P</span><p><strong>Pocket Flashcards</strong><br/>Review. Rinse. Repeat.</p><small>Study one set at a time.</small></footer>}
