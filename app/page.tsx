"use client";

import { useEffect, useMemo, useState } from "react";

type View = "home" | "upload" | "cards" | "study" | "stats" | "settings";
type Rating = "again" | "hard" | "good" | "easy";
type ModelConfig = { id:string; provider:string; providerLabel:string; model:string; apiKey:string; baseUrl:string; enabled:boolean; isDefault:boolean };

const cards = [
  { id: 1, type: "思维模型", front: "看到“已知 GCD 和 LCM 求两个整数”，第一步想到什么？", back: "设 a = gcd × x，b = gcd × y，且 gcd(x,y)=1，再结合 a×b = gcd×lcm。", path: "199 管综 / 数学 / 算术", tags: ["错题", "必背"], interval: "今天", tone: "violet" },
  { id: 2, type: "知识点", front: "充分条件和必要条件的逻辑关系是什么？", back: "若 P → Q，则 P 是 Q 的充分条件，Q 是 P 的必要条件。", path: "199 管综 / 逻辑 / 形式逻辑", tags: ["高频"], interval: "今天", tone: "blue" },
  { id: 3, type: "原题", front: "已知 a、b 的最大公约数为 6，最小公倍数为 90……", back: "由 a×b = gcd(a,b)×lcm(a,b) 建立乘积关系，再引入互质变量求解。", path: "199 管综 / 数学 / 算术", tags: ["二刷"], interval: "明天", tone: "orange" },
  { id: 4, type: "背诵", front: "What does 'in light of' mean?", back: "鉴于；考虑到。例：In light of recent events, we changed the plan.", path: "英语二 / 阅读 / 熟词僻义", tags: ["没掌握"], interval: "3 天后", tone: "green" },
];

const nav = [
  ["home", "首页", "◈"], ["upload", "上传学习内容", "↑"], ["cards", "学习卡片", "▱"], ["stats", "学习统计", "⌑"], ["settings", "设置", "⚙"],
] as const;

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [studyIndex, setStudyIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(18);
  const [query, setQuery] = useState("");
  const [uploadMode, setUploadMode] = useState<"memorization" | "question" | null>(null);
  const [notice, setNotice] = useState("");
  const [modelConfigs,setModelConfigs]=useState<ModelConfig[]>([]);
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
        {view === "settings" && <Settings configs={modelConfigs} setConfigs={setModelConfigs} />}
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

function Upload({mode,setMode}:{mode:"memorization"|"question"|null;setMode:(m:"memorization"|"question")=>void}) {
  const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState(""); const [dragging,setDragging]=useState(false); const [message,setMessage]=useState("");
  function acceptImage(next?:File){if(!next)return;if(!next.type.startsWith("image/")){setMessage("请选择图片文件");return}setFile(next);setMessage("")}
  useEffect(()=>{if(!file){setPreview("");return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
  useEffect(()=>{function onPaste(event:ClipboardEvent){const image=Array.from(event.clipboardData?.items||[]).find(item=>item.type.startsWith("image/"))?.getAsFile();if(image){event.preventDefault();acceptImage(new File([image],`clipboard-${Date.now()}.${image.type.split("/")[1]||"png"}`,{type:image.type}));setMessage("已从剪贴板粘贴图片")}}window.addEventListener("paste",onPaste);return()=>window.removeEventListener("paste",onPaste)},[]);
  return <div className="page upload-page"><div className="page-heading"><div><span className="eyebrow">AI 学习助手</span><h1>上传学习内容</h1><p>拖拽、点击选择，或直接粘贴截图，让 AI 把它变成可以长期复习的卡片。</p></div></div><div className="upload-layout"><section><div className={`dropzone ${file?"has-file":""} ${dragging?"dragging":""}`} onDragEnter={e=>{e.preventDefault();setDragging(true)}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{e.preventDefault();setDragging(false)}} onDrop={e=>{e.preventDefault();setDragging(false);acceptImage(e.dataTransfer.files[0])}}><input aria-label="选择图片" type="file" accept="image/*" onChange={e=>acceptImage(e.target.files?.[0])}/>{preview?<><img className="upload-preview" src={preview} alt="待上传图片预览"/><button className="remove-upload" onClick={e=>{e.preventDefault();e.stopPropagation();setFile(null);setMessage("")}} aria-label="移除图片">×</button><div className="file-summary"><strong>{file?.name}</strong><span>{file?`${(file.size/1024/1024).toFixed(2)} MB · ${file.type.replace("image/","").toUpperCase()}`:""}</span></div></>:<><div className="upload-icon">↑</div><h2>{dragging?"松手即可添加图片":"拖拽图片到这里"}</h2><p>点击选择，或按 <kbd>⌘ V</kbd> / <kbd>Ctrl V</kbd> 粘贴截图</p><div className="format-hint">PNG、JPG、WEBP</div></>}</div>{message&&<div className={`upload-message ${file?"success":"error"}`}>{file?"✓":"!"} {message}</div>}<h3 className="mode-title">你希望如何处理这份资料？</h3><div className="mode-grid"><button className={mode==="memorization"?"selected":""} onClick={()=>setMode("memorization")}><i>◇</i><strong>背诵内容</strong><span>提取独立知识点，自动生成问题与答案</span></button><button className={mode==="question"?"selected":""} onClick={()=>setMode("question")}><i>∑</i><strong>题目模式</strong><span>识别并拆题，生成答案、解析与思维模型</span></button></div><button className="primary wide" disabled={!file||!mode}>{file&&mode?"开始 AI 解析 →":"请先上传图片并选择模式"}</button></section><aside className="pipeline"><h3>解析流程</h3>{["图片识别与内容拆分","逐项 AI 理解与生成","你审核、修改 AI 结果","选择并生成学习卡片"].map((x,i)=><div key={x}><b>{i+1}</b><span>{x}<small>{i===2?"结果不会自动入库":""}</small></span></div>)}<p>✦ 原始资料会永久保留，每张卡片都可回溯来源。</p></aside></div></div>
}

function Study({card,revealed,setRevealed,rate,current,notice,onExit}:{card:(typeof cards)[0];revealed:boolean;setRevealed:(v:boolean)=>void;rate:(r:Rating)=>void;current:number;notice:string;onExit:()=>void}) { return <div className="study-page"><header><button onClick={onExit}>×</button><div><span>今日学习</span><progress value={current} max="36"/><b>{current} / 36</b></div><button>···</button></header><div className="study-stage"><div className={`flashcard ${revealed?"revealed":""}`}><div className="flash-meta"><span>{card.type}</span><small>{card.path}</small></div><div className="flash-front"><small>问题</small><h2>{card.front}</h2></div>{revealed&&<div className="flash-back"><small>答案与解题模型</small><p>{card.back}</p></div>}<div className="flash-tags">{card.tags.map(t=><span key={t}>#{t}</span>)}</div></div>{!revealed?<button className="reveal" onClick={()=>setRevealed(true)}>查看答案 <kbd>Space</kbd></button>:<div className="ratings"><p>这次回忆得怎么样？</p><div><button onClick={()=>rate("again")}><b>Again</b><span>完全忘记</span><kbd>1</kbd></button><button onClick={()=>rate("hard")}><b>Hard</b><span>比较困难</span><kbd>2</kbd></button><button onClick={()=>rate("good")}><b>Good</b><span>正常想起</span><kbd>3</kbd></button><button onClick={()=>rate("easy")}><b>Easy</b><span>非常熟练</span><kbd>4</kbd></button></div></div>}{notice&&<div className="toast">{notice}</div>}</div></div> }

function Stats(){ return <div className="page"><div className="page-heading"><div><span className="eyebrow">记忆趋势</span><h1>学习统计</h1><p>看见每一次回忆如何让知识更牢固。</p></div></div><div className="stat-grid"><article><small>近 30 天复习</small><strong>684</strong><em>↑ 18%</em></article><article><small>平均记忆率</small><strong>87%</strong><em>稳定</em></article><article><small>已掌握</small><strong>426</strong><em>34% 卡片</em></article></div><section className="chart"><h3>近 14 天学习量</h3><div className="bars">{[34,52,41,65,48,72,28,56,82,61,76,90,68,84].map((n,i)=><i key={i} style={{height:`${n}%`}}><span>{n}</span></i>)}</div><div className="chart-labels"><span>8/06</span><span>8/12</span><span>今天</span></div></section></div> }

const providers = {
  openai:{label:"OpenAI",baseUrl:"https://api.openai.com/v1",models:["gpt-5.4","gpt-5.4-mini","gpt-4.1"]},
  anthropic:{label:"Anthropic",baseUrl:"https://api.anthropic.com/v1",models:["claude-sonnet-4-5","claude-opus-4-1"]},
  gemini:{label:"Google Gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",models:["gemini-2.5-pro","gemini-2.5-flash"]},
  deepseek:{label:"DeepSeek",baseUrl:"https://api.deepseek.com/v1",models:["deepseek-chat","deepseek-reasoner"]},
  custom:{label:"自定义兼容接口",baseUrl:"",models:[] as string[]},
};

function Settings({configs,setConfigs}:{configs:ModelConfig[];setConfigs:(next:ModelConfig[])=>void}){
  const [adding,setAdding]=useState(false);const [provider,setProvider]=useState<keyof typeof providers>("openai");const [model,setModel]=useState(providers.openai.models[0]);const [customModel,setCustomModel]=useState("");const [key,setKey]=useState("");const [baseUrl,setBaseUrl]=useState(providers.openai.baseUrl);const [showKey,setShowKey]=useState(false);
  function chooseProvider(value:keyof typeof providers){setProvider(value);setModel(providers[value].models[0]||"");setBaseUrl(providers[value].baseUrl);setCustomModel("")}
  function add(){const finalModel=provider==="custom"?customModel:model;if(!key.trim()||!finalModel.trim())return;const next:ModelConfig={id:crypto.randomUUID(),provider,providerLabel:providers[provider].label,model:finalModel,apiKey:key.trim(),baseUrl:baseUrl.trim(),enabled:true,isDefault:configs.length===0};setConfigs([...configs,next]);setKey("");setAdding(false)}
  function update(id:string,change:Partial<ModelConfig>){setConfigs(configs.map(c=>c.id===id?{...c,...change}:change.isDefault?{...c,isDefault:false}:c))}
  return <div className="page settings-page"><div className="page-heading"><div><span className="eyebrow">系统设置</span><h1>模型管理</h1><p>管理 AI 解析使用的厂商、模型和 API Key。</p></div><button className="primary" onClick={()=>setAdding(true)}>+ 添加模型</button></div><div className="security-note"><span>✦</span><div><strong>密钥安全</strong><p>API Key 不会在列表中显示。当前版本仅在本次页面会话中保留，关闭页面后自动清除。</p></div></div>{configs.length===0?<div className="empty-models"><div>⌘</div><h2>还没有可用的 AI 模型</h2><p>添加一个厂商和 API Key，才能开始图片识题与解析。</p><button onClick={()=>setAdding(true)}>+ 添加第一个模型</button></div>:<div className="model-list">{configs.map(config=><article key={config.id}><div className={`provider-logo ${config.provider}`}>{config.providerLabel.slice(0,2)}</div><div className="model-main"><div><h3>{config.providerLabel}</h3>{config.isDefault&&<span>默认解析模型</span>}</div><strong>{config.model}</strong><small>{config.baseUrl} · Key ••••{config.apiKey.slice(-4)}</small></div><label className="switch"><input type="checkbox" checked={config.enabled} onChange={e=>update(config.id,{enabled:e.target.checked})}/><i></i></label><button className="model-action" onClick={()=>update(config.id,{isDefault:true})}>{config.isDefault?"已默认":"设为默认"}</button><button className="delete-model" onClick={()=>setConfigs(configs.filter(c=>c.id!==config.id))}>删除</button></article>)}</div>}{adding&&<div className="modal-backdrop" onMouseDown={()=>setAdding(false)}><section className="model-modal" onMouseDown={e=>e.stopPropagation()}><header><div><span className="eyebrow">新建连接</span><h2>添加 AI 模型</h2></div><button onClick={()=>setAdding(false)}>×</button></header><label>模型厂商<select value={provider} onChange={e=>chooseProvider(e.target.value as keyof typeof providers)}>{Object.entries(providers).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></label><label>选择模型{provider==="custom"?<input value={customModel} onChange={e=>setCustomModel(e.target.value)} placeholder="例如 my-vision-model"/>:<select value={model} onChange={e=>setModel(e.target.value)}>{providers[provider].models.map(m=><option key={m}>{m}</option>)}</select>}</label><label>API 地址<input value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1"/></label><label>API Key<div className="key-input"><input type={showKey?"text":"password"} value={key} onChange={e=>setKey(e.target.value)} autoComplete="off" placeholder="在此粘贴 API Key"/><button onClick={()=>setShowKey(v=>!v)}>{showKey?"隐藏":"显示"}</button></div><small>请勿在聊天、文档或截图中分享密钥。</small></label><footer><button onClick={()=>setAdding(false)}>取消</button><button className="primary" disabled={!key.trim()||!(provider==="custom"?customModel:model)} onClick={add}>添加模型</button></footer></section></div>}</div>
}
