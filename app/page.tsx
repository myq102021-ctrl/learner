"use client";

import { useMemo, useState } from "react";

type View = "home" | "upload" | "cards" | "study" | "stats";
type Rating = "again" | "hard" | "good" | "easy";

const cards = [
  { id: 1, type: "思维模型", front: "看到“已知 GCD 和 LCM 求两个整数”，第一步想到什么？", back: "设 a = gcd × x，b = gcd × y，且 gcd(x,y)=1，再结合 a×b = gcd×lcm。", path: "199 管综 / 数学 / 算术", tags: ["错题", "必背"], interval: "今天", tone: "violet" },
  { id: 2, type: "知识点", front: "充分条件和必要条件的逻辑关系是什么？", back: "若 P → Q，则 P 是 Q 的充分条件，Q 是 P 的必要条件。", path: "199 管综 / 逻辑 / 形式逻辑", tags: ["高频"], interval: "今天", tone: "blue" },
  { id: 3, type: "原题", front: "已知 a、b 的最大公约数为 6，最小公倍数为 90……", back: "由 a×b = gcd(a,b)×lcm(a,b) 建立乘积关系，再引入互质变量求解。", path: "199 管综 / 数学 / 算术", tags: ["二刷"], interval: "明天", tone: "orange" },
  { id: 4, type: "背诵", front: "What does 'in light of' mean?", back: "鉴于；考虑到。例：In light of recent events, we changed the plan.", path: "英语二 / 阅读 / 熟词僻义", tags: ["没掌握"], interval: "3 天后", tone: "green" },
];

const nav = [
  ["home", "首页", "◈"], ["upload", "上传学习内容", "↑"], ["cards", "学习卡片", "▱"], ["stats", "学习统计", "⌑"],
] as const;

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [studyIndex, setStudyIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(18);
  const [query, setQuery] = useState("");
  const [uploadMode, setUploadMode] = useState<"memorization" | "question" | null>(null);
  const [notice, setNotice] = useState("");
  const dueCards = cards.slice(0, 2);
  const activeCard = dueCards[studyIndex % dueCards.length];
  const filtered = useMemo(() => cards.filter(c => `${c.front}${c.tags.join("")}${c.path}`.toLowerCase().includes(query.toLowerCase())), [query]);

  function rate(rating: Rating) {
    const label = { again: "重新学习", hard: "稍后巩固", good: "4 天后复习", easy: "15 天后复习" }[rating];
    setNotice(`已记录·${label}`);
    setCompleted(v => v + 1);
    setTimeout(() => { setStudyIndex(v => v + 1); setRevealed(false); setNotice(""); }, 650);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("home")}><span className="brand-mark">L</span><span>Learner<small>个人学习机</small></span></button>
        <nav>{nav.map(([id, label, icon]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id as View)}><i>{icon}</i>{label}{id === "cards" && <b>1,238</b>}</button>)}</nav>
        <div className="sidebar-card"><span>本周连续学习</span><strong>6 <small>天</small></strong><div className="week">{["M","T","W","T","F","S","S"].map((d,i)=><i className={i<6?"done":""} key={i}>{i<6?"✓":d}</i>)}</div></div>
        <button className="profile"><span>林</span><span>林晓宇<small>学习设置</small></span><i>···</i></button>
      </aside>

      <section className="workspace">
        <header className="topbar"><div className="mobile-logo">Learner</div><button className="search" onClick={() => setView("cards")}><span>⌕</span>搜索卡片、标签或目录 <kbd>⌘ K</kbd></button><div className="top-actions"><button>○</button><button>♧</button><span className="avatar">林</span></div></header>

        {view === "home" && <Dashboard onStudy={() => setView("study")} onUpload={() => setView("upload")} onCards={() => setView("cards")} completed={completed} />}
        {view === "cards" && <CardLibrary cards={filtered} query={query} setQuery={setQuery} onStudy={() => setView("study")} />}
        {view === "upload" && <Upload mode={uploadMode} setMode={setUploadMode} />}
        {view === "study" && <Study card={activeCard} revealed={revealed} setRevealed={setRevealed} rate={rate} current={studyIndex+1} notice={notice} onExit={() => setView("home")} />}
        {view === "stats" && <Stats />}
      </section>
    </main>
  );
}

function Dashboard({onStudy,onUpload,onCards,completed}:{onStudy:()=>void;onUpload:()=>void;onCards:()=>void;completed:number}) {
  return <div className="page dashboard"><div className="eyebrow">周三 · 8月19日</div><h1>早上好，林晓宇 <span>✦</span></h1><p className="lead">今天也来让知识留下来。</p>
    <section className="hero-card"><div className="hero-copy"><div className="hero-label"><i></i>今日学习</div><div className="hero-num">36 <small>张待复习</small></div><p>其中 8 张是易错题，优先复习会更高效</p><button className="primary light" onClick={onStudy}>开始学习 <span>→</span></button></div><div className="orbit"><span className="orb one">逻辑</span><span className="orb two">GCD</span><span className="orb three">if</span><span className="orb four">π</span><div className="rings"></div></div></section>
    <div className="metrics"><article><span className="metric-icon orange">◷</span><div><small>待复习</small><strong>36</strong></div><em>↑ 8 张易错</em></article><article><span className="metric-icon blue">+</span><div><small>今日新卡</small><strong>20</strong></div><em>建议上限 25</em></article><article><span className="metric-icon green">✓</span><div><small>今日已完成</small><strong>{completed}</strong></div><em>{Math.min(100, Math.round(completed/54*100))}% 进度</em></article></div>
    <div className="section-title"><div><h2>继续学习</h2><p>从最近的记忆状态继续</p></div><button onClick={onCards}>查看全部 →</button></div>
    <div className="recent-grid"><article className="recent orange-border"><div><span>数学 · 算术</span><b>12 / 48</b></div><h3>最大公约数与最小公倍数</h3><p>上次学习：昨天</p><progress value="25" max="100" /></article><article className="recent violet-border"><div><span>逻辑 · 形式逻辑</span><b>31 / 65</b></div><h3>充分条件、必要条件与假言命题</h3><p>上次学习：3 天前</p><progress value="48" max="100" /></article></div>
    <section className="create-panel"><div className="spark">✦</div><div><h2>把新知识变成长期记忆</h2><p>上传截图或照片，AI 会拆分知识、解题并生成学习卡片。</p></div><button className="primary" onClick={onUpload}>↑ 上传学习内容</button></section>
  </div>;
}

function CardLibrary({cards:items,query,setQuery,onStudy}:{cards:typeof cards;query:string;setQuery:(v:string)=>void;onStudy:()=>void}) {
  const list = items;
  return <div className="page"><div className="page-heading"><div><span className="eyebrow">知识库</span><h1>学习卡片</h1><p>1,238 张卡片，每一张都有完整的知识来源。</p></div><button className="primary" onClick={onStudy}>▶ 学习到期卡片</button></div><div className="library-tools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索卡片、标签或目录…"/><button>全部类型 ⌄</button><button>今日待复习</button></div><div className="card-list">{list.map(card=><article className="knowledge-card" key={card.id}><div className={`type-mark ${card.tone}`}>{card.type.slice(0,1)}</div><div className="card-body"><div><span className={`type-pill ${card.tone}`}>{card.type}</span><span className="path">{card.path}</span></div><h3>{card.front}</h3><div className="tags">{card.tags.map(t=><span key={t}>#{t}</span>)}</div></div><div className="due"><small>下次复习</small><strong>{card.interval}</strong><button aria-label="更多">···</button></div></article>)}</div></div>;
}

function Upload({mode,setMode}:{mode:"memorization"|"question"|null;setMode:(m:"memorization"|"question")=>void}) { const [file,setFile]=useState(""); return <div className="page upload-page"><div className="page-heading"><div><span className="eyebrow">AI 学习助手</span><h1>上传学习内容</h1><p>上传一张截图或照片，让 AI 把它变成可以长期复习的卡片。</p></div></div><div className="upload-layout"><section><div className={`dropzone ${file?"has-file":""}`}><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]?.name||"")}/><div className="upload-icon">{file?"✓":"↑"}</div><h2>{file||"拖拽图片到这里"}</h2><p>{file?"图片已就绪，请选择处理方式":"或点击选择图片 · PNG、JPG、WEBP"}</p></div><h3 className="mode-title">你希望如何处理这份资料？</h3><div className="mode-grid"><button className={mode==="memorization"?"selected":""} onClick={()=>setMode("memorization")}><i>◇</i><strong>背诵内容</strong><span>提取独立知识点，自动生成问题与答案</span></button><button className={mode==="question"?"selected":""} onClick={()=>setMode("question")}><i>∑</i><strong>题目模式</strong><span>识别并拆题，生成答案、解析与思维模型</span></button></div><button className="primary wide" disabled={!file||!mode}>{file&&mode?"开始 AI 解析 →":"请先上传图片并选择模式"}</button></section><aside className="pipeline"><h3>解析流程</h3>{["图片识别与内容拆分","逐项 AI 理解与生成","你审核、修改 AI 结果","选择并生成学习卡片"].map((x,i)=><div key={x}><b>{i+1}</b><span>{x}<small>{i===2?"结果不会自动入库":""}</small></span></div>)}<p>✦ 原始资料会永久保留，每张卡片都可回溯来源。</p></aside></div></div> }

function Study({card,revealed,setRevealed,rate,current,notice,onExit}:{card:(typeof cards)[0];revealed:boolean;setRevealed:(v:boolean)=>void;rate:(r:Rating)=>void;current:number;notice:string;onExit:()=>void}) { return <div className="study-page"><header><button onClick={onExit}>×</button><div><span>今日学习</span><progress value={current} max="36"/><b>{current} / 36</b></div><button>···</button></header><div className="study-stage"><div className={`flashcard ${revealed?"revealed":""}`}><div className="flash-meta"><span>{card.type}</span><small>{card.path}</small></div><div className="flash-front"><small>问题</small><h2>{card.front}</h2></div>{revealed&&<div className="flash-back"><small>答案与解题模型</small><p>{card.back}</p></div>}<div className="flash-tags">{card.tags.map(t=><span key={t}>#{t}</span>)}</div></div>{!revealed?<button className="reveal" onClick={()=>setRevealed(true)}>查看答案 <kbd>Space</kbd></button>:<div className="ratings"><p>这次回忆得怎么样？</p><div><button onClick={()=>rate("again")}><b>Again</b><span>完全忘记</span><kbd>1</kbd></button><button onClick={()=>rate("hard")}><b>Hard</b><span>比较困难</span><kbd>2</kbd></button><button onClick={()=>rate("good")}><b>Good</b><span>正常想起</span><kbd>3</kbd></button><button onClick={()=>rate("easy")}><b>Easy</b><span>非常熟练</span><kbd>4</kbd></button></div></div>}{notice&&<div className="toast">{notice}</div>}</div></div> }

function Stats(){ return <div className="page"><div className="page-heading"><div><span className="eyebrow">记忆趋势</span><h1>学习统计</h1><p>看见每一次回忆如何让知识更牢固。</p></div></div><div className="stat-grid"><article><small>近 30 天复习</small><strong>684</strong><em>↑ 18%</em></article><article><small>平均记忆率</small><strong>87%</strong><em>稳定</em></article><article><small>已掌握</small><strong>426</strong><em>34% 卡片</em></article></div><section className="chart"><h3>近 14 天学习量</h3><div className="bars">{[34,52,41,65,48,72,28,56,82,61,76,90,68,84].map((n,i)=><i key={i} style={{height:`${n}%`}}><span>{n}</span></i>)}</div><div className="chart-labels"><span>8/06</span><span>8/12</span><span>今天</span></div></section></div> }
