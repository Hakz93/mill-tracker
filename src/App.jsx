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

const C = {
  bg: "#010409", surface: "#0d1117", card: "#161b22", border: "#21262d",
  border2: "#30363d", text: "#e6edf3", muted: "#8b949e", muted2: "#6b7280",
  blue: "#1d4ed8", cyan: "#22d3ee", green: "#4ade80", amber: "#f59e0b", red: "#ef4444",
};

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

// ── HOOK: detect mobile ───────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
const StatusBadge = ({status, large}) => {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.color}55`,
      boxShadow: `0 0 8px ${c.glow}`, padding: large ? "5px 12px" : "2px 9px",
      borderRadius: "5px", fontSize: large ? "12px" : "10px", fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {c.emoji} {status}
    </span>
  );
};

const inp = (mobile, extra={}) => ({
  background: C.surface, border: `1px solid ${C.border2}`, color: C.text,
  borderRadius: mobile ? "10px" : "6px",
  padding: mobile ? "14px 16px" : "8px 12px",
  width: "100%", fontSize: mobile ? "16px" : "13px",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  WebkitAppearance: "none", ...extra
});

// ── ORDER MODAL (shared, adapts layout) ───────────────────────────────────────
function OrderModal({order, user, onSave, onClose, onDelete, isMobile}) {
  const [form, setForm] = useState(order);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const isMgr = user.role==="manager";
  const isOwner = form.operatorId===user.id;
  const canEdit = isMgr || isOwner;
  const isNew = !order._saved;

  const estRun = form.quantity&&form.timePerPiece ? (+form.quantity*+form.timePerPiece/60).toFixed(1) : null;
  const estTotal = form.quantity&&form.timePerPiece ? ((+form.quantity*+form.timePerPiece + +(form.setupTime||0))/60).toFixed(1) : null;

  const lbl = { color:C.muted, fontSize:"10px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom: isMobile?"6px":"4px", display:"block" };
  const Field = ({label, children, col}) => (
    <div style={{marginBottom: isMobile?"16px":"13px", gridColumn:col}}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );

  const overlay = isMobile
    ? {position:"fixed",inset:0,background:"#000000bb",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}
    : {position:"fixed",inset:0,background:"#000000aa",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"};

  const panel = isMobile
    ? {background:C.card,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"600px",maxHeight:"92vh",overflowY:"auto",padding:"8px 0 0"}
    : {background:C.card,border:`1px solid ${C.border2}`,borderRadius:"12px",width:"min(580px,95vw)",maxHeight:"90vh",overflowY:"auto",padding:"26px",boxShadow:"0 24px 48px #00000080"};

  return (
    <div style={overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={panel}>
        {isMobile && <div style={{width:40,height:4,background:C.border2,borderRadius:2,margin:"0 auto 16px"}}/>}
        <div style={{padding: isMobile?"0 20px 100px":"0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
            <div>
              <h2 style={{margin:0,color:C.text,fontSize: isMobile?"20px":"16px",fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:"0.06em"}}>
                {isNew?"NEW ORDER":`ORDER ${form.orderNum||"—"}`}
              </h2>
              {!isNew&&<div style={{color:C.muted,fontSize:"12px",marginTop:"2px"}}>by {opName(form.operatorId)}</div>}
            </div>
            {!isMobile && <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"20px"}}>✕</button>}
            {!isNew && isMobile && <StatusBadge status={form.status} large/>}
          </div>

          <Field label="Order #"><input style={inp(isMobile)} value={form.orderNum} onChange={e=>set("orderNum",e.target.value)} disabled={!canEdit} placeholder="PO-2024-001"/></Field>
          <Field label="Drawing / DRW"><input style={inp(isMobile)} value={form.drw} onChange={e=>set("drw",e.target.value)} disabled={!canEdit} placeholder="DRW-A-042"/></Field>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            <Field label="Machine">
              <select style={inp(isMobile)} value={form.machine} onChange={e=>set("machine",e.target.value)} disabled={!isMgr&&!isNew}>
                {MACHINES.map(m=><option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Operator">
              <select style={inp(isMobile)} value={form.operatorId} onChange={e=>set("operatorId",e.target.value)} disabled={!isMgr}>
                {OPERATORS.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Status selector */}
          {isMobile ? (
            <Field label="Status">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
                {STATUSES.map(s=>(
                  <button key={s} onClick={()=>canEdit&&set("status",s)} style={{
                    background:form.status===s?STATUS_CONFIG[s].bg:C.surface,
                    border:`2px solid ${form.status===s?STATUS_CONFIG[s].color:C.border}`,
                    color:form.status===s?STATUS_CONFIG[s].color:C.muted,
                    borderRadius:"10px",padding:"10px 4px",cursor:canEdit?"pointer":"default",
                    fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",
                    WebkitTapHighlightColor:"transparent",
                  }}>{STATUS_CONFIG[s].emoji}<br/>{s}</button>
                ))}
              </div>
            </Field>
          ) : (
            <Field label="Status">
              <select style={inp(false)} value={form.status} onChange={e=>set("status",e.target.value)} disabled={!canEdit}>
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
            <Field label="Qty (pcs)"><input style={inp(isMobile)} type="number" inputMode="numeric" value={form.quantity} onChange={e=>set("quantity",e.target.value)} disabled={!canEdit} placeholder="0"/></Field>
            <Field label="Setup (min)"><input style={inp(isMobile)} type="number" inputMode="numeric" value={form.setupTime} onChange={e=>set("setupTime",e.target.value)} disabled={!canEdit} placeholder="0"/></Field>
            <Field label="T/pc (min)"><input style={inp(isMobile)} type="number" inputMode="numeric" value={form.timePerPiece} onChange={e=>set("timePerPiece",e.target.value)} disabled={!canEdit} placeholder="0"/></Field>
          </div>

          {estTotal && (
            <div style={{background:C.surface,border:`1px solid ${C.cyan}22`,borderRadius:"12px",padding:"14px 16px",marginBottom:"16px",display:"flex",justifyContent:"space-around"}}>
              <div style={{textAlign:"center"}}>
                <div style={{color:C.muted,fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Est. Run</div>
                <div style={{color:C.cyan,fontSize: isMobile?"26px":"20px",fontWeight:700,fontFamily:"'Rajdhani',sans-serif"}}>{estRun}h</div>
              </div>
              <div style={{width:1,background:C.border}}/>
              <div style={{textAlign:"center"}}>
                <div style={{color:C.muted,fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Total w/ Setup</div>
                <div style={{color:C.green,fontSize: isMobile?"26px":"20px",fontWeight:700,fontFamily:"'Rajdhani',sans-serif"}}>{estTotal}h</div>
              </div>
            </div>
          )}

          <Field label="Notes">
            <textarea style={{...inp(isMobile),resize:"vertical",minHeight:"72px"}} value={form.notes} onChange={e=>set("notes",e.target.value)} disabled={!canEdit} placeholder="Additional notes…"/>
          </Field>

          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",flexDirection: isMobile?"column":"row"}}>
            {isMgr&&onDelete&&<button onClick={()=>onDelete(form.id)} style={{background:"#2d0000",border:`1px solid ${C.red}55`,color:C.red,borderRadius: isMobile?"14px":"6px",padding: isMobile?"16px":"8px 16px",cursor:"pointer",fontSize: isMobile?"15px":"13px",fontWeight:600,WebkitTapHighlightColor:"transparent"}}>Delete Order</button>}
            {!isMobile&&<button onClick={onClose} style={{background:"none",border:`1px solid ${C.border2}`,color:C.muted,borderRadius:"6px",padding:"8px 16px",cursor:"pointer",fontSize:"13px"}}>Cancel</button>}
            {canEdit&&<button onClick={()=>onSave({...form,_saved:true,updatedAt:new Date().toISOString()})} style={{background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",border:"none",color:"#fff",borderRadius: isMobile?"14px":"6px",padding: isMobile?"18px":"8px 20px",cursor:"pointer",fontSize: isMobile?"17px":"13px",fontWeight:700,WebkitTapHighlightColor:"transparent"}}>Save Order</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ORDER CARD ────────────────────────────────────────────────────────────────
function OrderCard({order, onClick, isMobile}) {
  const c = STATUS_CONFIG[order.status];
  const estTotal = order.quantity&&order.timePerPiece ? ((+order.quantity*+order.timePerPiece + +(order.setupTime||0))/60).toFixed(1) : null;

  if (isMobile) return (
    <div onClick={onClick} style={{background:C.card,border:`1px solid ${c.color}33`,borderLeft:`4px solid ${c.color}`,borderRadius:"14px",padding:"16px",cursor:"pointer",marginBottom:"10px",WebkitTapHighlightColor:"transparent"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
        <div>
          <div style={{color:C.text,fontWeight:700,fontSize:"18px",fontFamily:"'Rajdhani',sans-serif"}}>{order.orderNum||"No Order #"}</div>
          <div style={{color:C.muted,fontSize:"13px",marginTop:"2px"}}>DRW: <span style={{color:"#c9d1d9"}}>{order.drw||"—"}</span></div>
        </div>
        <StatusBadge status={order.status}/>
      </div>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"8px"}}>
        {order.quantity&&<div style={{background:C.surface,borderRadius:"8px",padding:"5px 10px",fontSize:"12px"}}><span style={{color:C.muted}}>Qty </span><span style={{color:C.text,fontWeight:700}}>{order.quantity}</span></div>}
        {order.setupTime&&<div style={{background:C.surface,borderRadius:"8px",padding:"5px 10px",fontSize:"12px"}}><span style={{color:C.muted}}>Setup </span><span style={{color:C.text,fontWeight:700}}>{order.setupTime}m</span></div>}
        {order.timePerPiece&&<div style={{background:C.surface,borderRadius:"8px",padding:"5px 10px",fontSize:"12px"}}><span style={{color:C.muted}}>T/pc </span><span style={{color:C.text,fontWeight:700}}>{order.timePerPiece}m</span></div>}
        {estTotal&&<div style={{background:"#002d3322",border:`1px solid ${C.cyan}33`,borderRadius:"8px",padding:"5px 10px",fontSize:"12px"}}><span style={{color:C.muted}}>Total </span><span style={{color:C.cyan,fontWeight:700}}>{estTotal}h</span></div>}
      </div>
      <div style={{color:C.muted,fontSize:"12px"}}>👤 {opName(order.operatorId)} · {order.machine}</div>
    </div>
  );

  // Desktop card
  return (
    <div onClick={onClick} style={{background:C.card,border:`1px solid ${c.color}33`,borderLeft:`3px solid ${c.color}`,borderRadius:"6px",padding:"10px 12px",cursor:"pointer",marginBottom:"7px",transition:"background 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.background="#1c2128"}
      onMouseLeave={e=>e.currentTarget.style.background=C.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"5px"}}>
        <span style={{color:C.text,fontWeight:700,fontSize:"13px",fontFamily:"'Rajdhani',sans-serif"}}>{order.orderNum||"—"}</span>
        <StatusBadge status={order.status}/>
      </div>
      <div style={{color:C.muted,fontSize:"11px",marginBottom:"3px"}}>DRW: <span style={{color:"#c9d1d9"}}>{order.drw||"—"}</span></div>
      <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
        {order.quantity&&<div style={{color:C.muted,fontSize:"11px"}}>Qty: <span style={{color:"#c9d1d9"}}>{order.quantity}</span></div>}
        {order.setupTime&&<div style={{color:C.muted,fontSize:"11px"}}>Setup: <span style={{color:"#c9d1d9"}}>{order.setupTime}m</span></div>}
        {order.timePerPiece&&<div style={{color:C.muted,fontSize:"11px"}}>T/pc: <span style={{color:"#c9d1d9"}}>{order.timePerPiece}m</span></div>}
        {estTotal&&<div style={{color:C.muted,fontSize:"11px"}}>Total: <span style={{color:C.cyan,fontWeight:700}}>{estTotal}h</span></div>}
      </div>
      <div style={{color:C.muted,fontSize:"11px",marginTop:"3px"}}>👤 {opName(order.operatorId)}</div>
    </div>
  );
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen({onLogin, isMobile}) {
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const tryManager = () => {
    if (pin === MANAGER_PIN) onLogin({role:"manager",id:"manager",name:"Manager"});
    else { setErr("Wrong PIN"); setPin(""); }
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",boxSizing:"border-box"}}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
      <div style={{textAlign:"center",marginBottom:"32px"}}>
        <div style={{width: isMobile?72:60,height: isMobile?72:60,borderRadius:"20px",background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize: isMobile?"36px":"28px",margin:"0 auto 16px"}}>⚙</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize: isMobile?"32px":"26px",fontWeight:700,letterSpacing:"0.12em",color:C.text}}>MILL CONTROL</div>
        <div style={{color:C.muted,fontSize:"12px",letterSpacing:"0.12em"}}>PRODUCTION TRACKER</div>
      </div>

      {!pinMode ? (
        <div style={{width:"100%",maxWidth: isMobile?"400px":"360px"}}>
          <div style={{color:C.muted,fontSize:"11px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"12px",textAlign:"center"}}>Select Your Name</div>
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {OPERATORS.map(op=>(
              <button key={op.id} onClick={()=>onLogin({role:"operator",...op})} style={{
                background:C.card,border:`1px solid ${C.border}`,color:C.text,
                borderRadius: isMobile?"14px":"10px",padding: isMobile?"18px 20px":"14px 16px",
                cursor:"pointer",fontSize: isMobile?"18px":"15px",
                fontFamily:"'Rajdhani',sans-serif",fontWeight:600,letterSpacing:"0.06em",
                textAlign:"left",display:"flex",alignItems:"center",gap:"12px",
                WebkitTapHighlightColor:"transparent",transition:"border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e=>{if(!isMobile){e.currentTarget.style.borderColor="#0ea5e9";e.currentTarget.style.color="#0ea5e9";}}}
              onMouseLeave={e=>{if(!isMobile){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text;}}}>
                <span style={{fontSize: isMobile?"24px":"18px"}}>👤</span> {op.name}
              </button>
            ))}
          </div>
          <button onClick={()=>setPinMode(true)} style={{marginTop:"16px",width:"100%",background:"none",border:`1px solid ${C.border2}`,color:C.muted,borderRadius: isMobile?"14px":"10px",padding: isMobile?"16px":"12px",cursor:"pointer",fontSize: isMobile?"15px":"13px",WebkitTapHighlightColor:"transparent"}}>🔐 Manager Login</button>
        </div>
      ) : (
        <div style={{width:"100%",maxWidth:"320px",display:"flex",flexDirection:"column",gap:"12px"}}>
          <div style={{color:C.text,fontFamily:"'Rajdhani',sans-serif",fontSize:"20px",fontWeight:700,letterSpacing:"0.1em",textAlign:"center"}}>MANAGER PIN</div>
          <div style={{color:C.muted,fontSize:"12px",textAlign:"center"}}>Default PIN: 1234</div>
          <input type="password" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryManager()} placeholder="Enter PIN" style={inp(isMobile)} autoFocus/>
          {err&&<div style={{color:C.red,fontSize:"13px",textAlign:"center"}}>{err}</div>}
          <button onClick={tryManager} style={{background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",border:"none",color:"#fff",borderRadius: isMobile?"12px":"8px",padding: isMobile?"18px":"12px",cursor:"pointer",fontSize: isMobile?"17px":"14px",fontWeight:700,WebkitTapHighlightColor:"transparent"}}>Login</button>
          <button onClick={()=>{setPinMode(false);setPin("");setErr("");}} style={{background:"none",border:`1px solid ${C.border2}`,color:C.muted,borderRadius: isMobile?"12px":"8px",padding: isMobile?"16px":"12px",cursor:"pointer",fontSize: isMobile?"15px":"13px",WebkitTapHighlightColor:"transparent"}}>Back</button>
        </div>
      )}
    </div>
  );
}

// ── MOBILE APP ────────────────────────────────────────────────────────────────
function MobileApp({user, orders, setOrders, setUser, setModal, modal, save, del}) {
  const [tab, setTab] = useState("orders");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const isMgr = user.role==="manager";
  const myOrders = orders.filter(o=>o.operatorId===user.id);
  const stats = {total:orders.length,running:orders.filter(o=>o.status==="Running").length,pending:orders.filter(o=>o.status==="Pending").length,done:orders.filter(o=>o.status==="Completed").length};
  const searchResults = search.length>1 ? orders.filter(o=>[o.orderNum,o.drw,opName(o.operatorId),o.machine].some(v=>v?.toLowerCase().includes(search.toLowerCase()))) : [];

  const startX = useRef(null);
  const [machineIdx, setMachineIdx] = useState(0);

  const navItems = isMgr
    ? [{id:"orders",icon:"📋",label:"Orders"},{id:"board",icon:"🏭",label:"Machines"},{id:"search",icon:"🔍",label:"Search"},{id:"manager",icon:"📊",label:"Manager"}]
    : [{id:"orders",icon:"📋",label:"My Orders"},{id:"board",icon:"🏭",label:"Shop Floor"},{id:"search",icon:"🔍",label:"Search"}];

  const mOrders = orders.filter(o=>o.machine===MACHINES[machineIdx]);
  const mActive = mOrders.filter(o=>o.status==="Running").length;

  return (
    <div style={{height:"100vh",background:C.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:C.text,display:"flex",flexDirection:"column",overflow:"hidden",maxWidth:"600px",margin:"0 auto"}}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:34,height:34,borderRadius:"10px",background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>⚙</div>
          <div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"16px",fontWeight:700,letterSpacing:"0.08em"}}>MILL CONTROL</div>
            <div style={{fontSize:"10px",color:C.muted}}>{isMgr?"🔐 Manager":`👤 ${user.name}`}</div>
          </div>
        </div>
        <button onClick={()=>setModal(blankOrder(user.id))} style={{background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",border:"none",color:"#fff",borderRadius:"12px",padding:"10px 16px",cursor:"pointer",fontSize:"14px",fontWeight:700,WebkitTapHighlightColor:"transparent"}}>+ New</button>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>

        {tab==="orders"&&(
          <div style={{flex:1,padding:"16px",overflowY:"auto"}}>
            <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"12px",scrollbarWidth:"none"}}>
              {["All",...STATUSES].map(s=>(
                <button key={s} onClick={()=>setFilterStatus(s)} style={{background:filterStatus===s?(s==="All"?"#1d4ed8":STATUS_CONFIG[s]?.bg||"#1d4ed8"):C.card,border:`1px solid ${filterStatus===s?(s==="All"?"#0ea5e9":STATUS_CONFIG[s]?.color||"#0ea5e9"):C.border}`,color:filterStatus===s?(s==="All"?"#fff":STATUS_CONFIG[s]?.color||"#fff"):C.muted,borderRadius:"20px",padding:"7px 14px",cursor:"pointer",fontSize:"12px",fontWeight:600,whiteSpace:"nowrap",flexShrink:0,WebkitTapHighlightColor:"transparent"}}>{s==="All"?"All":s}</button>
              ))}
            </div>
            {isMgr&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"16px"}}>
                {[{l:"Total",v:stats.total,c:C.muted},{l:"Running",v:stats.running,c:C.cyan},{l:"Pending",v:stats.pending,c:C.amber},{l:"Done",v:stats.done,c:C.green}].map(s=>(
                  <div key={s.l} style={{background:C.card,borderRadius:"12px",padding:"12px 8px",textAlign:"center"}}>
                    <div style={{color:s.c,fontSize:"24px",fontWeight:700,fontFamily:"'Rajdhani',sans-serif"}}>{s.v}</div>
                    <div style={{color:C.muted2,fontSize:"10px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
            {(isMgr?orders:myOrders).filter(o=>filterStatus==="All"||o.status===filterStatus).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).map(o=><OrderCard key={o.id} order={o} onClick={()=>setModal(o)} isMobile/>)}
            {(isMgr?orders:myOrders).length===0&&(<div style={{textAlign:"center",padding:"60px 24px"}}><div style={{fontSize:"40px",marginBottom:"12px"}}>📋</div><div style={{color:C.muted,fontSize:"16px"}}>No orders yet</div><div style={{color:C.muted2,fontSize:"13px",marginTop:"4px"}}>Tap + New to add one</div></div>)}
          </div>
        )}

        {tab==="board"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",paddingTop:"16px",overflow:"hidden"}}>
            <div style={{display:"flex",overflowX:"auto",padding:"0 16px",gap:"8px",paddingBottom:"10px",scrollbarWidth:"none"}}>
              {MACHINES.map((m,i)=>{
                const cnt = orders.filter(o=>o.machine===m).length;
                const run = orders.filter(o=>o.machine===m&&o.status==="Running").length;
                return (
                  <button key={m} onClick={()=>setMachineIdx(i)} style={{background:machineIdx===i?"linear-gradient(135deg,#1d4ed8,#0ea5e9)":C.card,border:`1px solid ${machineIdx===i?"#0ea5e9":C.border}`,color:machineIdx===i?"#fff":C.muted,borderRadius:"20px",padding:"8px 16px",cursor:"pointer",fontSize:"13px",fontWeight:600,whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:"6px",WebkitTapHighlightColor:"transparent"}}>
                    {run>0&&<span style={{width:7,height:7,borderRadius:"50%",background:C.cyan,boxShadow:`0 0 6px ${C.cyan}`,display:"inline-block"}}/>}
                    {m}{cnt>0&&<span style={{background:machineIdx===i?"#ffffff30":"#30363d",borderRadius:"10px",padding:"1px 7px",fontSize:"11px"}}>{cnt}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"0 16px"}}
              onTouchStart={e=>{startX.current=e.touches[0].clientX;}}
              onTouchEnd={e=>{if(startX.current===null)return;const diff=startX.current-e.changedTouches[0].clientX;if(diff>50&&machineIdx<MACHINES.length-1)setMachineIdx(i=>i+1);if(diff<-50&&machineIdx>0)setMachineIdx(i=>i-1);startX.current=null;}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <div>
                  <div style={{color:C.text,fontFamily:"'Rajdhani',sans-serif",fontSize:"20px",fontWeight:700,letterSpacing:"0.08em"}}>{MACHINES[machineIdx]}</div>
                  <div style={{color:C.muted,fontSize:"12px"}}>{mOrders.length} orders{mActive>0&&<span style={{color:C.cyan}}> · {mActive} running</span>}</div>
                </div>
                <div style={{color:C.muted2,fontSize:"11px"}}>swipe ←→</div>
              </div>
              {mOrders.length===0&&(<div style={{textAlign:"center",padding:"48px 24px",border:`1px dashed ${C.border}`,borderRadius:"14px"}}><div style={{fontSize:"32px",marginBottom:"8px"}}>🏭</div><div style={{color:C.muted2,fontSize:"14px"}}>No orders on this machine</div></div>)}
              {mOrders.map(o=><OrderCard key={o.id} order={o} onClick={()=>setModal(o)} isMobile/>)}
            </div>
          </div>
        )}

        {tab==="search"&&(
          <div style={{flex:1,padding:"16px",overflowY:"auto"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order #, DRW, operator…" style={inp(true,{marginBottom:"16px"})} autoFocus/>
            {search.length>1&&searchResults.length===0&&(<div style={{textAlign:"center",padding:"40px",color:C.muted}}>No results found</div>)}
            {searchResults.map(o=><OrderCard key={o.id} order={o} onClick={()=>setModal(o)} isMobile/>)}
            {search.length<=1&&(<div style={{textAlign:"center",padding:"40px 24px"}}><div style={{fontSize:"36px",marginBottom:"8px"}}>🔍</div><div style={{color:C.muted,fontSize:"15px"}}>Search by order #, DRW or operator</div></div>)}
            <button onClick={()=>setUser(null)} style={{marginTop:"20px",width:"100%",background:"none",border:`1px solid ${C.border2}`,color:C.muted,borderRadius:"14px",padding:"14px",cursor:"pointer",fontSize:"14px",WebkitTapHighlightColor:"transparent"}}>Logout ({user.name})</button>
          </div>
        )}

        {tab==="manager"&&isMgr&&(
          <div style={{flex:1,padding:"16px",overflowY:"auto"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"16px"}}>
              {[{l:"Total Orders",v:stats.total,c:C.muted,icon:"📋"},{l:"Running",v:stats.running,c:C.cyan,icon:"▶️"},{l:"Pending",v:stats.pending,c:C.amber,icon:"⏳"},{l:"Completed",v:stats.done,c:C.green,icon:"✅"}].map(s=>(
                <div key={s.l} style={{background:C.card,borderRadius:"14px",padding:"16px"}}>
                  <div style={{fontSize:"22px",marginBottom:"4px"}}>{s.icon}</div>
                  <div style={{color:s.c,fontSize:"28px",fontWeight:700,fontFamily:"'Rajdhani',sans-serif"}}>{s.v}</div>
                  <div style={{color:C.muted2,fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{color:C.muted,fontSize:"11px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"10px"}}>By Machine</div>
            {MACHINES.map(m=>{
              const mc=orders.filter(o=>o.machine===m);const mr=mc.filter(o=>o.status==="Running").length;
              return(<div key={m} onClick={()=>{setTab("board");setMachineIdx(MACHINES.indexOf(m));}} style={{background:C.card,borderRadius:"12px",padding:"14px 16px",marginBottom:"8px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  {mr>0&&<div style={{width:8,height:8,borderRadius:"50%",background:C.cyan,boxShadow:`0 0 8px ${C.cyan}`}}/>}
                  <div><div style={{color:C.text,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",fontSize:"16px"}}>{m}</div><div style={{color:C.muted,fontSize:"12px"}}>{mc.length} orders</div></div>
                </div>
                {mr>0&&<span style={{background:"#002d3380",color:C.cyan,border:`1px solid ${C.cyan}55`,borderRadius:"6px",padding:"3px 10px",fontSize:"11px",fontWeight:700}}>▶ {mr}</span>}
              </div>);
            })}
            <button onClick={()=>exportCSV(orders)} style={{width:"100%",background:"#002d11",border:`1px solid ${C.green}55`,color:C.green,borderRadius:"14px",padding:"18px",cursor:"pointer",fontSize:"16px",fontWeight:700,marginBottom:"10px",marginTop:"8px",WebkitTapHighlightColor:"transparent"}}>↓ Export CSV</button>
            <button onClick={()=>setUser(null)} style={{width:"100%",background:"none",border:`1px solid ${C.border2}`,color:C.muted,borderRadius:"14px",padding:"16px",cursor:"pointer",fontSize:"15px",WebkitTapHighlightColor:"transparent"}}>Logout</button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom,0px)",flexShrink:0}}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,background:"none",border:"none",color:tab===n.id?C.cyan:C.muted2,padding:"12px 4px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",WebkitTapHighlightColor:"transparent"}}>
            <span style={{fontSize:"22px"}}>{n.icon}</span>
            <span style={{fontSize:"10px",fontWeight:600,letterSpacing:"0.04em"}}>{n.label}</span>
            {tab===n.id&&<div style={{width:20,height:2,background:C.cyan,borderRadius:1}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── DESKTOP APP ───────────────────────────────────────────────────────────────
function DesktopApp({user, orders, setOrders, setUser, setModal, modal, save, del}) {
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMachine, setFilterMachine] = useState("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("board");
  const isMgr = user.role==="manager";
  const myOrders = orders.filter(o=>o.operatorId===user.id);
  const stats = {total:orders.length,running:orders.filter(o=>o.status==="Running").length,pending:orders.filter(o=>o.status==="Pending").length,done:orders.filter(o=>o.status==="Completed").length};

  const filtered = orders.filter(o=>{
    if(filterStatus!=="All"&&o.status!==filterStatus) return false;
    if(filterMachine!=="All"&&o.machine!==filterMachine) return false;
    if(search){const q=search.toLowerCase();if(![o.orderNum,o.drw,opName(o.operatorId)].some(v=>v?.toLowerCase().includes(q)))return false;}
    return true;
  });

  const selInp = (x={}) => inp(false,{width:"auto",padding:"6px 10px",...x});

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Share Tech Mono','Courier New',monospace",color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"0 20px",background:C.surface,display:"flex",alignItems:"center",justifyContent:"space-between",height:"54px",position:"sticky",top:0,zIndex:50,gap:"10px",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:32,height:32,borderRadius:"8px",background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>⚙</div>
          <div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",fontWeight:700,letterSpacing:"0.1em"}}>MILL CONTROL</div>
            <div style={{fontSize:"9px",color:C.muted,letterSpacing:"0.08em"}}>PRODUCTION TRACKER</div>
          </div>
        </div>
        {isMgr&&(
          <div style={{display:"flex",gap:"18px"}}>
            {[{l:"TOTAL",v:stats.total,c:C.muted},{l:"RUNNING",v:stats.running,c:C.cyan},{l:"PENDING",v:stats.pending,c:C.amber},{l:"DONE",v:stats.done,c:C.green}].map(s=>(
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{color:s.c,fontWeight:700,fontSize:"18px",fontFamily:"'Rajdhani',sans-serif"}}>{s.v}</div>
                <div style={{color:C.muted2,fontSize:"9px",letterSpacing:"0.06em"}}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
        {!isMgr&&(
          <div style={{display:"flex",gap:"16px"}}>
            {[{l:"MY ORDERS",v:myOrders.length,c:C.muted},{l:"RUNNING",v:myOrders.filter(o=>o.status==="Running").length,c:C.cyan},{l:"DONE",v:myOrders.filter(o=>o.status==="Completed").length,c:C.green}].map(s=>(
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{color:s.c,fontWeight:700,fontSize:"18px",fontFamily:"'Rajdhani',sans-serif"}}>{s.v}</div>
                <div style={{color:C.muted2,fontSize:"9px",letterSpacing:"0.06em"}}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{color:C.muted,fontSize:"11px"}}>{isMgr?"🔐 Manager":`👤 ${user.name}`}</div>
          {isMgr&&<button onClick={()=>exportCSV(orders)} style={{background:"#002d11",border:`1px solid ${C.green}55`,color:C.green,borderRadius:"6px",padding:"6px 12px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>↓ CSV</button>}
          <button onClick={()=>setUser(null)} style={{background:"none",border:`1px solid ${C.border2}`,color:C.muted,borderRadius:"6px",padding:"5px 12px",cursor:"pointer",fontSize:"11px"}}>Logout</button>
          <button onClick={()=>setModal(blankOrder(user.id))} style={{background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",border:"none",color:"#fff",borderRadius:"7px",padding:"7px 14px",cursor:"pointer",fontSize:"12px",fontWeight:700}}>+ NEW ORDER</button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{padding:"10px 20px",borderBottom:`1px solid ${C.border}`,background:C.surface,display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, DRW, operator…" style={selInp({width:"200px"})}/>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={selInp()}>
          <option>All</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={filterMachine} onChange={e=>setFilterMachine(e.target.value)} style={selInp()}>
          <option>All</option>{MACHINES.map(m=><option key={m}>{m}</option>)}
        </select>
        {isMgr&&(
          <div style={{marginLeft:"auto",display:"flex",gap:"4px"}}>
            {["board","list"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{background:view===v?"#1d4ed8":"none",border:`1px solid ${view===v?"#1d4ed8":C.border2}`,color:view===v?"#fff":C.muted,borderRadius:"5px",padding:"5px 10px",cursor:"pointer",fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                {v==="board"?"⬛ Board":"☰ List"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{padding:"16px 20px"}}>
        {!isMgr&&(
          <>
            <div style={{marginBottom:"24px"}}>
              <div style={{color:C.muted,fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"10px"}}>My Orders</div>
              {myOrders.length===0&&(<div style={{color:C.border2,fontSize:"13px",padding:"24px",textAlign:"center",border:`1px dashed ${C.border}`,borderRadius:"8px"}}>No orders yet — click + NEW ORDER to add one</div>)}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"8px"}}>
                {myOrders.filter(o=>{if(filterStatus!=="All"&&o.status!==filterStatus)return false;if(filterMachine!=="All"&&o.machine!==filterMachine)return false;return true;}).map(o=><OrderCard key={o.id} order={o} onClick={()=>setModal(o)} isMobile={false}/>)}
              </div>
            </div>
            <div style={{color:C.muted,fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"10px"}}>Shop Floor Overview</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"10px",overflowX:"auto",minWidth:"600px"}}>
              {MACHINES.map(m=>{
                const mOrds=filtered.filter(o=>o.machine===m);const act=mOrds.filter(o=>o.status==="Running").length;
                return(<div key={m} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
                  <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,background:act>0?"#002d3322":C.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{color:C.text,fontWeight:700,fontSize:"12px",fontFamily:"'Rajdhani',sans-serif",letterSpacing:"0.1em"}}>{m.toUpperCase()}</div><div style={{color:C.muted,fontSize:"10px"}}>{mOrds.length} orders</div></div>
                    {act>0&&<div style={{width:7,height:7,borderRadius:"50%",background:C.cyan,boxShadow:`0 0 6px ${C.cyan}`}}/>}
                  </div>
                  <div style={{padding:"8px"}}>{mOrds.slice(0,4).map(o=><OrderCard key={o.id} order={o} onClick={()=>setModal(o)} isMobile={false}/>)}{mOrds.length===0&&<div style={{color:C.border2,fontSize:"11px",textAlign:"center",padding:"12px 0"}}>Empty</div>}{mOrds.length>4&&<div style={{color:C.muted,fontSize:"10px",textAlign:"center"}}>+{mOrds.length-4} more</div>}</div>
                </div>);
              })}
            </div>
          </>
        )}

        {isMgr&&view==="board"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"12px",minWidth:"900px",overflowX:"auto"}}>
            {MACHINES.map(m=>{
              const mOrds=filtered.filter(o=>o.machine===m);const act=mOrds.filter(o=>o.status==="Running").length;
              return(<div key={m} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"10px",display:"flex",flexDirection:"column",minHeight:260,overflow:"hidden"}}>
                <div style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,background:act>0?"#002d3322":C.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{color:C.text,fontWeight:700,fontSize:"12px",fontFamily:"'Rajdhani',sans-serif",letterSpacing:"0.1em"}}>{m.toUpperCase()}</div><div style={{color:C.muted,fontSize:"10px"}}>{mOrds.length} orders</div></div>
                  {act>0&&<div style={{display:"flex",alignItems:"center",gap:"5px"}}><div style={{width:7,height:7,borderRadius:"50%",background:C.cyan,boxShadow:`0 0 6px ${C.cyan}`}}/><span style={{color:C.cyan,fontSize:"10px",fontWeight:700}}>LIVE</span></div>}
                </div>
                <div style={{padding:"8px",flex:1}}>{mOrds.map(o=><OrderCard key={o.id} order={o} onClick={()=>setModal(o)} isMobile={false}/>)}{mOrds.length===0&&<div style={{color:C.border2,fontSize:"11px",textAlign:"center",marginTop:"20px"}}>No orders</div>}</div>
              </div>);
            })}
          </div>
        )}

        {isMgr&&view==="list"&&(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["Order #","DRW","Machine","Status","Operator","Qty","Setup","T/pc","Est. Total","Updated"].map(h=>(<th key={h} style={{padding:"8px 12px",color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",fontSize:"10px",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
              <tbody>
                {filtered.map(o=>{
                  const total=o.quantity&&o.timePerPiece?((+o.quantity*+o.timePerPiece + +(o.setupTime||0))/60).toFixed(1)+"h":"—";
                  return(<tr key={o.id} onClick={()=>setModal(o)} style={{borderBottom:`1px solid ${C.card}`,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"9px 12px",color:C.text,fontWeight:700}}>{o.orderNum||"—"}</td>
                    <td style={{padding:"9px 12px",color:"#c9d1d9"}}>{o.drw||"—"}</td>
                    <td style={{padding:"9px 12px",color:"#c9d1d9"}}>{o.machine}</td>
                    <td style={{padding:"9px 12px"}}><StatusBadge status={o.status}/></td>
                    <td style={{padding:"9px 12px",color:"#c9d1d9"}}>{opName(o.operatorId)}</td>
                    <td style={{padding:"9px 12px",color:"#c9d1d9"}}>{o.quantity||"—"}</td>
                    <td style={{padding:"9px 12px",color:"#c9d1d9"}}>{o.setupTime?o.setupTime+"m":"—"}</td>
                    <td style={{padding:"9px 12px",color:"#c9d1d9"}}>{o.timePerPiece?o.timePerPiece+"m":"—"}</td>
                    <td style={{padding:"9px 12px",color:C.cyan,fontWeight:700}}>{total}</td>
                    <td style={{padding:"9px 12px",color:C.muted2,fontSize:"11px"}}>{new Date(o.updatedAt).toLocaleDateString()}</td>
                  </tr>);
                })}
                {filtered.length===0&&<tr><td colSpan={10} style={{textAlign:"center",color:C.border2,padding:"40px"}}>No orders found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState(()=>{
    try{return JSON.parse(localStorage.getItem("mill_orders_v4")||"[]");}catch{return [];}
  });
  const [modal, setModal] = useState(null);

  useEffect(()=>{
    try{localStorage.setItem("mill_orders_v4",JSON.stringify(orders));}catch{}
  },[orders]);

  const save = (form) => {
    setOrders(prev=>{ const ex=prev.find(o=>o.id===form.id); return ex?prev.map(o=>o.id===form.id?form:o):[...prev,form]; });
    setModal(null);
  };
  const del = (id) => { setOrders(prev=>prev.filter(o=>o.id!==id)); setModal(null); };

  if (!user) return <LoginScreen onLogin={setUser} isMobile={isMobile}/>;

  const shared = {user, orders, setOrders, setUser: ()=>setUser(null), setModal, modal, save, del};

  return (
    <>
      {isMobile
        ? <MobileApp {...shared}/>
        : <DesktopApp {...shared}/>
      }
      {modal && (
        <OrderModal order={modal} user={user} onSave={save} onClose={()=>setModal(null)}
          onDelete={user.role==="manager"&&orders.find(o=>o.id===modal.id)?del:null}
          isMobile={isMobile}/>
      )}
    </>
  );
}