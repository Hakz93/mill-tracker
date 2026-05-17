import { useState, useEffect, useRef } from "react";

const MACHINES = ["Mill #1", "Mill #2", "Mill #3", "Mill #4", "Mill #5"];
const MANAGER_PIN = "1234";

const OPERATORS = [
  { id: "op1", name: "Carlos M." },
  { id: "op2", name: "Jake T." },
  { id: "op3", name: "Luis R." },
  { id: "op4", name: "Steve W." },
  { id: "op5", name: "Tom B." },
];

const STATUS_CONFIG = {
  Pending:    { color: "#6b7280", bg: "#1f293780", glow: "#6b728040", emoji: "⏳" },
  "In Setup": { color: "#f59e0b", bg: "#2d1f0080", glow: "#f59e0b40", emoji: "🔧" },
  Running:    { color: "#22d3ee", bg: "#002d3380", glow: "#22d3ee40", emoji: "▶️" },
  "On Hold":  { color: "#f97316", bg: "#2d120080", glow: "#f9731640", emoji: "⏸" },
  Completed:  { color: "#4ade80", bg: "#002d1180", glow: "#4ade8040", emoji: "✅" },
  Cancelled:  { color: "#ef4444", bg: "#2d000080", glow: "#ef444440", emoji: "❌" },
};
const STATUSES = Object.keys(STATUS_CONFIG);

const blankOrder = (operatorId, machine) => ({
  id: Date.now().toString(),
  orderNum: "", drw: "", machine: machine || MACHINES[0],
  operatorId: operatorId || "",
  status: "Pending", quantity: "", setupTime: "", timePerPiece: "", notes: "",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

const opName = (id) => OPERATORS.find(o => o.id === id)?.name || "—";

const exportCSV = (orders) => {
  const h = ["Order#","DRW","Machine","Status","Operator","Qty","Setup(min)","T/pc(min)","EstTotal(h)","Notes","Created"];
  const rows = orders.map(o => [
    o.orderNum, o.drw, o.machine, o.status, opName(o.operatorId),
    o.quantity, o.setupTime, o.timePerPiece,
    o.quantity && o.timePerPiece ? ((+o.quantity * +o.timePerPiece + +(o.setupTime||0))/60).toFixed(1) : "",
    o.notes, new Date(o.createdAt).toLocaleString()
  ]);
  const csv = [h,...rows].map(r=>r.map(c=>`"${c??""}"` ).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download = `mill-orders-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#010409", surface: "#0d1117", card: "#161b22", border: "#21262d",
  border2: "#30363d", text: "#e6edf3", muted: "#8b949e", muted2: "#6b7280",
  blue: "#1d4ed8", cyan: "#22d3ee", green: "#4ade80", amber: "#f59e0b", red: "#ef4444",
};

const inp = (x={}) => ({
  background: C.surface, border: `1px solid ${C.border2}`, color: C.text,
  borderRadius: "10px", padding: "14px 16px", width: "100%", fontSize: "16px",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  WebkitAppearance: "none", ...x
});

const StatusBadge = ({status, large}) => {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.color}55`,
      boxShadow: `0 0 10px ${c.glow}`, padding: large ? "6px 14px" : "3px 10px",
      borderRadius: "6px", fontSize: large ? "13px" : "11px", fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {c.emoji} {status}
    </span>
  );
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const tryManager = () => {
    if (pin === MANAGER_PIN) onLogin({role:"manager", id:"manager", name:"Manager"});
    else { setErr("Wrong PIN"); setPin(""); }
  };

  return (
    <div style={{minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", boxSizing:"border-box"}}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet"/>
      <div style={{textAlign:"center", marginBottom:"32px"}}>
        <div style={{width:72, height:72, borderRadius:"20px", background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"36px", margin:"0 auto 16px"}}>⚙</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:"32px", fontWeight:700, letterSpacing:"0.1em", color:C.text}}>MILL CONTROL</div>
        <div style={{color:C.muted, fontSize:"13px", letterSpacing:"0.1em"}}>PRODUCTION TRACKER</div>
      </div>

      {!pinMode ? (
        <div style={{width:"100%", maxWidth:"400px"}}>
          <div style={{color:C.muted, fontSize:"12px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px", textAlign:"center"}}>Select Your Name</div>
          <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
            {OPERATORS.map(op => (
              <button key={op.id} onClick={() => onLogin({role:"operator",...op})} style={{
                background: C.card, border: `1px solid ${C.border}`, color: C.text,
                borderRadius: "14px", padding: "18px 20px", cursor: "pointer",
                fontSize: "18px", fontFamily:"'Rajdhani',sans-serif", fontWeight: 600,
                letterSpacing: "0.06em", textAlign: "left", display: "flex", alignItems: "center", gap: "12px",
                WebkitTapHighlightColor: "transparent",
              }}>
                <span style={{fontSize:"24px"}}>👤</span> {op.name}
              </button>
            ))}
          </div>
          <button onClick={()=>setPinMode(true)} style={{
            marginTop:"20px", width:"100%", background:"none", border:`1px solid ${C.border2}`,
            color:C.muted, borderRadius:"14px", padding:"16px", cursor:"pointer", fontSize:"15px",
            WebkitTapHighlightColor:"transparent",
          }}>🔐 Manager Login</button>
        </div>
      ) : (
        <div style={{width:"100%", maxWidth:"360px", display:"flex", flexDirection:"column", gap:"14px"}}>
          <div style={{color:C.text, fontFamily:"'Rajdhani',sans-serif", fontSize:"22px", fontWeight:700, letterSpacing:"0.1em", textAlign:"center"}}>MANAGER PIN</div>
          <div style={{color:C.muted, fontSize:"13px", textAlign:"center"}}>Default PIN: 1234</div>
          <input type="password" value={pin} onChange={e=>setPin(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&tryManager()}
            placeholder="Enter PIN" style={inp()} autoFocus/>
          {err && <div style={{color:C.red, fontSize:"14px", textAlign:"center"}}>{err}</div>}
          <button onClick={tryManager} style={{background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", border:"none", color:"#fff", borderRadius:"12px", padding:"18px", cursor:"pointer", fontSize:"17px", fontWeight:700, WebkitTapHighlightColor:"transparent"}}>Login</button>
          <button onClick={()=>{setPinMode(false);setPin("");setErr("");}} style={{background:"none", border:`1px solid ${C.border2}`, color:C.muted, borderRadius:"12px", padding:"16px", cursor:"pointer", fontSize:"15px", WebkitTapHighlightColor:"transparent"}}>Back</button>
        </div>
      )}
    </div>
  );
}

// ── ORDER MODAL ───────────────────────────────────────────────────────────────
function OrderModal({order, user, onSave, onClose, onDelete}) {
  const [form, setForm] = useState(order);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const isMgr = user.role==="manager";
  const isOwner = form.operatorId===user.id;
  const canEdit = isMgr || isOwner;
  const isNew = !order._saved;

  const estRun = form.quantity&&form.timePerPiece ? (+form.quantity * +form.timePerPiece/60).toFixed(1) : null;
  const estTotal = form.quantity&&form.timePerPiece ? ((+form.quantity * +form.timePerPiece + +(form.setupTime||0))/60).toFixed(1) : null;

  const Field = ({label, children}) => (
    <div style={{marginBottom:"16px"}}>
      <label style={{color:C.muted, fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"6px", display:"block"}}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{position:"fixed", inset:0, background:"#000000bb", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.card, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"600px", maxHeight:"92vh", overflowY:"auto", padding:"8px 0 0"}}>
        {/* Handle */}
        <div style={{width:40, height:4, background:C.border2, borderRadius:2, margin:"0 auto 16px"}}/>
        <div style={{padding:"0 20px 100px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px"}}>
            <div>
              <h2 style={{margin:0, color:C.text, fontSize:"20px", fontWeight:700, fontFamily:"'Rajdhani',sans-serif", letterSpacing:"0.06em"}}>
                {isNew ? "NEW ORDER" : `ORDER ${form.orderNum||"—"}`}
              </h2>
              {!isNew && <div style={{color:C.muted, fontSize:"12px", marginTop:"2px"}}>by {opName(form.operatorId)}</div>}
            </div>
            {!isNew && <StatusBadge status={form.status} large/>}
          </div>

          <Field label="Order #">
            <input style={inp()} value={form.orderNum} onChange={e=>set("orderNum",e.target.value)} disabled={!canEdit} placeholder="e.g. PO-2024-001"/>
          </Field>
          <Field label="Drawing / DRW">
            <input style={inp()} value={form.drw} onChange={e=>set("drw",e.target.value)} disabled={!canEdit} placeholder="e.g. DRW-A-042"/>
          </Field>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px"}}>
            <Field label="Machine">
              <select style={inp()} value={form.machine} onChange={e=>set("machine",e.target.value)} disabled={!isMgr&&!isNew}>
                {MACHINES.map(m=><option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Operator">
              <select style={inp()} value={form.operatorId} onChange={e=>set("operatorId",e.target.value)} disabled={!isMgr}>
                {OPERATORS.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Status">
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px"}}>
              {STATUSES.map(s => (
                <button key={s} onClick={()=>canEdit&&set("status",s)} style={{
                  background: form.status===s ? STATUS_CONFIG[s].bg : C.surface,
                  border: `2px solid ${form.status===s ? STATUS_CONFIG[s].color : C.border}`,
                  color: form.status===s ? STATUS_CONFIG[s].color : C.muted,
                  borderRadius:"10px", padding:"10px 4px", cursor:canEdit?"pointer":"default",
                  fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em",
                  WebkitTapHighlightColor:"transparent",
                }}>
                  {STATUS_CONFIG[s].emoji}<br/>{s}
                </button>
              ))}
            </div>
          </Field>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px"}}>
            <Field label="Qty (pcs)">
              <input style={inp()} type="number" inputMode="numeric" value={form.quantity} onChange={e=>set("quantity",e.target.value)} disabled={!canEdit} placeholder="0"/>
            </Field>
            <Field label="Setup (min)">
              <input style={inp()} type="number" inputMode="numeric" value={form.setupTime} onChange={e=>set("setupTime",e.target.value)} disabled={!canEdit} placeholder="0"/>
            </Field>
            <Field label="T/pc (min)">
              <input style={inp()} type="number" inputMode="numeric" value={form.timePerPiece} onChange={e=>set("timePerPiece",e.target.value)} disabled={!canEdit} placeholder="0"/>
            </Field>
          </div>

          {estTotal && (
            <div style={{background:C.surface, border:`1px solid ${C.cyan}22`, borderRadius:"12px", padding:"14px 16px", marginBottom:"16px", display:"flex", gap:"0", justifyContent:"space-around"}}>
              <div style={{textAlign:"center"}}>
                <div style={{color:C.muted, fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase"}}>Est. Run</div>
                <div style={{color:C.cyan, fontSize:"26px", fontWeight:700, fontFamily:"'Rajdhani',sans-serif"}}>{estRun}h</div>
              </div>
              <div style={{width:1, background:C.border}}/>
              <div style={{textAlign:"center"}}>
                <div style={{color:C.muted, fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase"}}>Total w/ Setup</div>
                <div style={{color:C.green, fontSize:"26px", fontWeight:700, fontFamily:"'Rajdhani',sans-serif"}}>{estTotal}h</div>
              </div>
            </div>
          )}

          <Field label="Notes">
            <textarea style={{...inp(), resize:"vertical", minHeight:"80px"}} value={form.notes} onChange={e=>set("notes",e.target.value)} disabled={!canEdit} placeholder="Additional notes…"/>
          </Field>

          {canEdit && (
            <button onClick={()=>onSave({...form, _saved:true, updatedAt:new Date().toISOString()})} style={{
              width:"100%", background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", border:"none", color:"#fff",
              borderRadius:"14px", padding:"18px", cursor:"pointer", fontSize:"17px", fontWeight:700,
              marginBottom:"10px", WebkitTapHighlightColor:"transparent",
            }}>Save Order</button>
          )}
          {isMgr && onDelete && (
            <button onClick={()=>onDelete(form.id)} style={{
              width:"100%", background:"#2d0000", border:`1px solid ${C.red}55`, color:C.red,
              borderRadius:"14px", padding:"16px", cursor:"pointer", fontSize:"15px", fontWeight:600,
              WebkitTapHighlightColor:"transparent",
            }}>Delete Order</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ORDER CARD ────────────────────────────────────────────────────────────────
function OrderCard({order, onClick}) {
  const c = STATUS_CONFIG[order.status];
  const estTotal = order.quantity&&order.timePerPiece ? ((+order.quantity * +order.timePerPiece + +(order.setupTime||0))/60).toFixed(1) : null;
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${c.color}33`, borderLeft: `4px solid ${c.color}`,
      borderRadius: "14px", padding: "16px", cursor: "pointer", marginBottom: "10px",
      WebkitTapHighlightColor: "transparent", active: {opacity:0.8},
    }}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px"}}>
        <div>
          <div style={{color:C.text, fontWeight:700, fontSize:"18px", fontFamily:"'Rajdhani',sans-serif"}}>{order.orderNum||"No Order #"}</div>
          <div style={{color:C.muted, fontSize:"13px", marginTop:"2px"}}>DRW: <span style={{color:"#c9d1d9"}}>{order.drw||"—"}</span></div>
        </div>
        <StatusBadge status={order.status}/>
      </div>
      <div style={{display:"flex", gap:"14px", flexWrap:"wrap", marginBottom:"8px"}}>
        {order.quantity&&<div style={{background:C.surface, borderRadius:"8px", padding:"6px 10px", fontSize:"13px"}}><span style={{color:C.muted}}>Qty </span><span style={{color:C.text, fontWeight:700}}>{order.quantity}</span></div>}
        {order.setupTime&&<div style={{background:C.surface, borderRadius:"8px", padding:"6px 10px", fontSize:"13px"}}><span style={{color:C.muted}}>Setup </span><span style={{color:C.text, fontWeight:700}}>{order.setupTime}m</span></div>}
        {order.timePerPiece&&<div style={{background:C.surface, borderRadius:"8px", padding:"6px 10px", fontSize:"13px"}}><span style={{color:C.muted}}>T/pc </span><span style={{color:C.text, fontWeight:700}}>{order.timePerPiece}m</span></div>}
        {estTotal&&<div style={{background:"#002d3322", border:`1px solid ${C.cyan}33`, borderRadius:"8px", padding:"6px 10px", fontSize:"13px"}}><span style={{color:C.muted}}>Total </span><span style={{color:C.cyan, fontWeight:700}}>{estTotal}h</span></div>}
      </div>
      <div style={{color:C.muted, fontSize:"13px"}}>👤 {opName(order.operatorId)} · {order.machine}</div>
    </div>
  );
}

// ── MACHINE SWIPER (for board view) ──────────────────────────────────────────
function MachineSwiper({orders, onCard, onNew, user}) {
  const [idx, setIdx] = useState(0);
  const startX = useRef(null);

  const handleTouchStart = e => { startX.current = e.touches[0].clientX; };
  const handleTouchEnd = e => {
    if (startX.current === null) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (diff > 50 && idx < MACHINES.length-1) setIdx(i=>i+1);
    if (diff < -50 && idx > 0) setIdx(i=>i-1);
    startX.current = null;
  };

  const mOrders = orders.filter(o=>o.machine===MACHINES[idx]);
  const active = mOrders.filter(o=>o.status==="Running").length;

  return (
    <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
      {/* Machine tabs */}
      <div style={{display:"flex", overflowX:"auto", padding:"0 16px", gap:"8px", paddingBottom:"10px", scrollbarWidth:"none"}}>
        {MACHINES.map((m,i)=>{
          const mActive = orders.filter(o=>o.machine===m&&o.status==="Running").length;
          const mCount = orders.filter(o=>o.machine===m).length;
          return (
            <button key={m} onClick={()=>setIdx(i)} style={{
              background: idx===i ? "linear-gradient(135deg,#1d4ed8,#0ea5e9)" : C.card,
              border: `1px solid ${idx===i?"#0ea5e9":C.border}`,
              color: idx===i?"#fff":C.muted, borderRadius:"20px",
              padding:"8px 16px", cursor:"pointer", fontSize:"13px", fontWeight:600,
              whiteSpace:"nowrap", flexShrink:0, display:"flex", alignItems:"center", gap:"6px",
              WebkitTapHighlightColor:"transparent",
            }}>
              {mActive>0&&<span style={{width:7, height:7, borderRadius:"50%", background:"#22d3ee", boxShadow:"0 0 6px #22d3ee", display:"inline-block"}}/>}
              {m} {mCount>0&&<span style={{background:idx===i?"#ffffff30":"#30363d", borderRadius:"10px", padding:"1px 7px", fontSize:"11px"}}>{mCount}</span>}
            </button>
          );
        })}
      </div>

      {/* Machine panel */}
      <div style={{flex:1, overflowY:"auto", padding:"0 16px"}}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px"}}>
          <div>
            <div style={{color:C.text, fontFamily:"'Rajdhani',sans-serif", fontSize:"20px", fontWeight:700, letterSpacing:"0.08em"}}>{MACHINES[idx]}</div>
            <div style={{color:C.muted, fontSize:"12px"}}>{mOrders.length} orders {active>0&&<span style={{color:C.cyan}}>· {active} running</span>}</div>
          </div>
          <div style={{color:C.muted, fontSize:"12px"}}>{idx+1}/{MACHINES.length} · swipe</div>
        </div>

        {mOrders.length===0 && (
          <div style={{textAlign:"center", padding:"48px 24px", border:`1px dashed ${C.border}`, borderRadius:"14px"}}>
            <div style={{fontSize:"32px", marginBottom:"8px"}}>🏭</div>
            <div style={{color:C.muted2, fontSize:"14px"}}>No orders on this machine</div>
          </div>
        )}
        {mOrders.map(o=><OrderCard key={o.id} order={o} onClick={()=>onCard(o)}/>)}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState(()=>{
    try{return JSON.parse(localStorage.getItem("mill_orders_v4")||"[]");}catch{return [];}
  });
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("orders"); // orders | board | search | manager
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(()=>{
    try{localStorage.setItem("mill_orders_v4",JSON.stringify(orders));}catch{}
  },[orders]);

  const isMgr = user?.role==="manager";

  const save = (form) => {
    setOrders(prev=>{ const ex=prev.find(o=>o.id===form.id); return ex?prev.map(o=>o.id===form.id?form:o):[...prev,form]; });
    setModal(null);
  };
  const del = (id) => { setOrders(prev=>prev.filter(o=>o.id!==id)); setModal(null); };

  const myOrders = user ? orders.filter(o=>o.operatorId===user.id) : [];
  const stats = { total:orders.length, running:orders.filter(o=>o.status==="Running").length, pending:orders.filter(o=>o.status==="Pending").length, done:orders.filter(o=>o.status==="Completed").length };

  const searchResults = search.length > 1 ? orders.filter(o=>{
    const q = search.toLowerCase();
    return [o.orderNum,o.drw,opName(o.operatorId),o.machine].some(v=>v?.toLowerCase().includes(q));
  }) : [];

  if (!user) return <LoginScreen onLogin={setUser}/>;

  const navItems = isMgr
    ? [{id:"orders",icon:"📋",label:"Orders"},{id:"board",icon:"🏭",label:"Machines"},{id:"search",icon:"🔍",label:"Search"},{id:"manager",icon:"📊",label:"Manager"}]
    : [{id:"orders",icon:"📋",label:"My Orders"},{id:"board",icon:"🏭",label:"Shop Floor"},{id:"search",icon:"🔍",label:"Search"}];

  return (
    <div style={{height:"100vh", background:C.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:C.text, display:"flex", flexDirection:"column", overflow:"hidden", maxWidth:"600px", margin:"0 auto"}}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
          <div style={{width:34, height:34, borderRadius:"10px", background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px"}}>⚙</div>
          <div>
            <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:"16px", fontWeight:700, letterSpacing:"0.08em"}}>MILL CONTROL</div>
            <div style={{fontSize:"10px", color:C.muted}}>{isMgr?"🔐 Manager":`👤 ${user.name}`}</div>
          </div>
        </div>
        <button onClick={()=>setModal(blankOrder(user.id))} style={{
          background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", border:"none", color:"#fff",
          borderRadius:"12px", padding:"10px 16px", cursor:"pointer", fontSize:"14px", fontWeight:700,
          WebkitTapHighlightColor:"transparent",
        }}>+ New</button>
      </div>

      {/* CONTENT */}
      <div style={{flex:1, overflowY:"auto", display:"flex", flexDirection:"column"}}>

        {/* MY ORDERS / ALL ORDERS */}
        {tab==="orders" && (
          <div style={{flex:1, padding:"16px", overflowY:"auto"}}>
            {/* Status filter pills */}
            <div style={{display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"12px", scrollbarWidth:"none"}}>
              {["All",...STATUSES].map(s=>(
                <button key={s} onClick={()=>setFilterStatus(s)} style={{
                  background: filterStatus===s ? (s==="All"?"#1d4ed8":STATUS_CONFIG[s]?.bg||"#1d4ed8") : C.card,
                  border: `1px solid ${filterStatus===s?(s==="All"?"#0ea5e9":STATUS_CONFIG[s]?.color||"#0ea5e9"):C.border}`,
                  color: filterStatus===s?(s==="All"?"#fff":STATUS_CONFIG[s]?.color||"#fff"):C.muted,
                  borderRadius:"20px", padding:"7px 14px", cursor:"pointer", fontSize:"12px", fontWeight:600,
                  whiteSpace:"nowrap", flexShrink:0, WebkitTapHighlightColor:"transparent",
                }}>{s==="All"?"All Orders":s}</button>
              ))}
            </div>

            {/* Stats row (manager only) */}
            {isMgr && (
              <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"16px"}}>
                {[{l:"Total",v:stats.total,c:C.muted},{l:"Running",v:stats.running,c:C.cyan},{l:"Pending",v:stats.pending,c:C.amber},{l:"Done",v:stats.done,c:C.green}].map(s=>(
                  <div key={s.l} style={{background:C.card, borderRadius:"12px", padding:"12px 8px", textAlign:"center"}}>
                    <div style={{color:s.c, fontSize:"24px", fontWeight:700, fontFamily:"'Rajdhani',sans-serif"}}>{s.v}</div>
                    <div style={{color:C.muted2, fontSize:"10px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em"}}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Orders list */}
            {(isMgr ? orders : myOrders)
              .filter(o=>filterStatus==="All"||o.status===filterStatus)
              .sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))
              .map(o=><OrderCard key={o.id} order={o} onClick={()=>setModal(o)}/>)
            }
            {(isMgr?orders:myOrders).length===0&&(
              <div style={{textAlign:"center", padding:"60px 24px"}}>
                <div style={{fontSize:"40px", marginBottom:"12px"}}>📋</div>
                <div style={{color:C.muted, fontSize:"16px"}}>No orders yet</div>
                <div style={{color:C.muted2, fontSize:"13px", marginTop:"4px"}}>Tap + New to add one</div>
              </div>
            )}
          </div>
        )}

        {/* BOARD / SHOP FLOOR */}
        {tab==="board" && (
          <div style={{flex:1, display:"flex", flexDirection:"column", paddingTop:"16px", overflow:"hidden"}}>
            <MachineSwiper
              orders={isMgr?orders:orders}
              onCard={setModal}
              onNew={()=>setModal(blankOrder(user.id))}
              user={user}
            />
          </div>
        )}

        {/* SEARCH */}
        {tab==="search" && (
          <div style={{flex:1, padding:"16px", overflowY:"auto"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search order #, DRW, operator…"
              style={inp({marginBottom:"16px", fontSize:"16px"})} autoFocus/>
            {search.length>1&&searchResults.length===0&&(
              <div style={{textAlign:"center", padding:"40px", color:C.muted}}>No results found</div>
            )}
            {searchResults.map(o=><OrderCard key={o.id} order={o} onClick={()=>setModal(o)}/>)}
            {search.length<=1&&(
              <div style={{textAlign:"center", padding:"40px 24px"}}>
                <div style={{fontSize:"36px", marginBottom:"8px"}}>🔍</div>
                <div style={{color:C.muted, fontSize:"15px"}}>Search by order #, DRW, or operator name</div>
              </div>
            )}
          </div>
        )}

        {/* MANAGER PANEL */}
        {tab==="manager" && isMgr && (
          <div style={{flex:1, padding:"16px", overflowY:"auto"}}>
            <div style={{marginBottom:"20px"}}>
              <div style={{color:C.muted, fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px"}}>Overview</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px"}}>
                {[{l:"Total Orders",v:stats.total,c:C.muted,icon:"📋"},{l:"Running",v:stats.running,c:C.cyan,icon:"▶️"},{l:"Pending",v:stats.pending,c:C.amber,icon:"⏳"},{l:"Completed",v:stats.done,c:C.green,icon:"✅"}].map(s=>(
                  <div key={s.l} style={{background:C.card, borderRadius:"14px", padding:"16px"}}>
                    <div style={{fontSize:"22px", marginBottom:"4px"}}>{s.icon}</div>
                    <div style={{color:s.c, fontSize:"28px", fontWeight:700, fontFamily:"'Rajdhani',sans-serif"}}>{s.v}</div>
                    <div style={{color:C.muted2, fontSize:"11px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em"}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginBottom:"20px"}}>
              <div style={{color:C.muted, fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px"}}>By Machine</div>
              {MACHINES.map(m=>{
                const mOrders = orders.filter(o=>o.machine===m);
                const mRunning = mOrders.filter(o=>o.status==="Running").length;
                return (
                  <div key={m} onClick={()=>{setTab("board");}} style={{background:C.card, borderRadius:"12px", padding:"14px 16px", marginBottom:"8px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", WebkitTapHighlightColor:"transparent"}}>
                    <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                      {mRunning>0&&<div style={{width:8, height:8, borderRadius:"50%", background:C.cyan, boxShadow:`0 0 8px ${C.cyan}`}}/>}
                      <div>
                        <div style={{color:C.text, fontWeight:700, fontFamily:"'Rajdhani',sans-serif", fontSize:"16px"}}>{m}</div>
                        <div style={{color:C.muted, fontSize:"12px"}}>{mOrders.length} orders</div>
                      </div>
                    </div>
                    <div style={{display:"flex", gap:"6px"}}>
                      {mRunning>0&&<span style={{background:"#002d3380", color:C.cyan, border:`1px solid ${C.cyan}55`, borderRadius:"6px", padding:"3px 10px", fontSize:"11px", fontWeight:700}}>▶ {mRunning}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={()=>exportCSV(orders)} style={{
              width:"100%", background:"#002d11", border:`1px solid ${C.green}55`, color:C.green,
              borderRadius:"14px", padding:"18px", cursor:"pointer", fontSize:"16px", fontWeight:700,
              marginBottom:"10px", WebkitTapHighlightColor:"transparent",
            }}>↓ Export CSV</button>

            <button onClick={()=>setUser(null)} style={{
              width:"100%", background:"none", border:`1px solid ${C.border2}`, color:C.muted,
              borderRadius:"14px", padding:"16px", cursor:"pointer", fontSize:"15px",
              WebkitTapHighlightColor:"transparent",
            }}>Logout</button>
          </div>
        )}

        {/* OPERATOR LOGOUT on non-manager */}
        {tab==="search" && !isMgr && (
          <div style={{padding:"0 16px 16px"}}>
            <button onClick={()=>setUser(null)} style={{width:"100%", background:"none", border:`1px solid ${C.border2}`, color:C.muted, borderRadius:"14px", padding:"14px", cursor:"pointer", fontSize:"14px", WebkitTapHighlightColor:"transparent"}}>Logout ({user.name})</button>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", paddingBottom:"env(safe-area-inset-bottom,0px)", flexShrink:0}}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{
            flex:1, background:"none", border:"none", color:tab===n.id?C.cyan:C.muted2,
            padding:"12px 4px 10px", cursor:"pointer", display:"flex", flexDirection:"column",
            alignItems:"center", gap:"3px", WebkitTapHighlightColor:"transparent",
          }}>
            <span style={{fontSize:"22px"}}>{n.icon}</span>
            <span style={{fontSize:"10px", fontWeight:600, letterSpacing:"0.04em"}}>{n.label}</span>
            {tab===n.id&&<div style={{width:20, height:2, background:C.cyan, borderRadius:1}}/>}
          </button>
        ))}
      </div>

      {modal && (
        <OrderModal order={modal} user={user} onSave={save} onClose={()=>setModal(null)}
          onDelete={isMgr&&orders.find(o=>o.id===modal.id)?del:null}/>
      )}
    </div>
  );
}