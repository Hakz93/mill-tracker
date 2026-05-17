import { useState, useEffect } from "react";

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
  Pending:    { color: "#6b7280", bg: "#1f293780", glow: "#6b728040" },
  "In Setup": { color: "#f59e0b", bg: "#2d1f0080", glow: "#f59e0b40" },
  Running:    { color: "#22d3ee", bg: "#002d3380", glow: "#22d3ee40" },
  "On Hold":  { color: "#f97316", bg: "#2d120080", glow: "#f9731640" },
  Completed:  { color: "#4ade80", bg: "#002d1180", glow: "#4ade8040" },
  Cancelled:  { color: "#ef4444", bg: "#2d000080", glow: "#ef444440" },
};
const STATUSES = Object.keys(STATUS_CONFIG);

const blankOrder = (operatorId) => ({
  id: Date.now().toString(),
  orderNum: "", drw: "", machine: MACHINES[0],
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

const S = {
  inp: (x={}) => ({ background:"#0d1117", border:"1px solid #30363d", color:"#e6edf3", borderRadius:"6px", padding:"8px 12px", width:"100%", fontSize:"13px", fontFamily:"inherit", outline:"none", boxSizing:"border-box", ...x }),
  lbl: { color:"#8b949e", fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px", display:"block" },
  btn: {
    primary:{ background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", border:"none", color:"#fff", borderRadius:"6px", padding:"8px 20px", cursor:"pointer", fontSize:"13px", fontWeight:700 },
    danger: { background:"#2d0000", border:"1px solid #ef444455", color:"#ef4444", borderRadius:"6px", padding:"8px 16px", cursor:"pointer", fontSize:"13px", fontWeight:600 },
    ghost:  { background:"none", border:"1px solid #30363d", color:"#8b949e", borderRadius:"6px", padding:"8px 16px", cursor:"pointer", fontSize:"13px" },
    green:  { background:"#002d11", border:"1px solid #4ade8055", color:"#4ade80", borderRadius:"6px", padding:"6px 14px", cursor:"pointer", fontSize:"12px", fontWeight:600 }
  },
};

const StatusBadge = ({status}) => {
  const c = STATUS_CONFIG[status];
  return <span style={{background:c.bg, color:c.color, border:`1px solid ${c.color}55`, boxShadow:`0 0 8px ${c.glow}`, padding:"2px 10px", borderRadius:"4px", fontSize:"10px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap"}}>{status}</span>;
};

function LoginScreen({onLogin}) {
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const tryManager = () => {
    if (pin === MANAGER_PIN) onLogin({role:"manager", id:"manager", name:"Manager"});
    else { setErr("Wrong PIN"); setPin(""); }
  };

  return (
    <div style={{minHeight:"100vh", background:"#010409", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"28px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"38px", marginBottom:"8px"}}>⚙</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:"28px", fontWeight:700, letterSpacing:"0.15em", color:"#e6edf3"}}>MILL CONTROL</div>
        <div style={{color:"#8b949e", fontSize:"11px", letterSpacing:"0.12em"}}>PRODUCTION TRACKER</div>
      </div>
      {!pinMode ? (
        <div style={{background:"#0d1117", border:"1px solid #21262d", borderRadius:"12px", padding:"28px", width:"320px"}}>
          <div style={{...S.lbl, marginBottom:"12px"}}>Select Your Name</div>
          <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
            {OPERATORS.map(op => (
              <button key={op.id} onClick={() => onLogin({role:"operator",...op})}
                style={{background:"#161b22", border:"1px solid #30363d", color:"#e6edf3", borderRadius:"8px", padding:"11px 14px", cursor:"pointer", fontSize:"14px", fontFamily:"'Rajdhani',sans-serif", fontWeight:600, letterSpacing:"0.06em", textAlign:"left", transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#0ea5e9";e.currentTarget.style.color="#0ea5e9";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#30363d";e.currentTarget.style.color="#e6edf3";}}>
                👤 {op.name}
              </button>
            ))}
          </div>
          <div style={{borderTop:"1px solid #21262d", marginTop:"14px", paddingTop:"12px"}}>
            <button onClick={()=>setPinMode(true)} style={{...S.btn.ghost, width:"100%", fontSize:"12px"}}>🔐 Manager Login</button>
          </div>
        </div>
      ) : (
        <div style={{background:"#0d1117", border:"1px solid #21262d", borderRadius:"12px", padding:"28px", width:"300px", display:"flex", flexDirection:"column", gap:"12px"}}>
          <div style={{color:"#e6edf3", fontFamily:"'Rajdhani',sans-serif", fontSize:"16px", fontWeight:700, letterSpacing:"0.1em"}}>MANAGER PIN</div>
          <div style={{color:"#8b949e", fontSize:"11px"}}>Default PIN: 1234</div>
          <input type="password" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryManager()} placeholder="Enter PIN" style={S.inp()} autoFocus/>
          {err && <div style={{color:"#ef4444", fontSize:"12px"}}>{err}</div>}
          <div style={{display:"flex", gap:"8px"}}>
            <button onClick={()=>{setPinMode(false);setPin("");setErr("");}} style={{...S.btn.ghost, flex:1}}>Back</button>
            <button onClick={tryManager} style={{...S.btn.primary, flex:1}}>Login</button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderModal({order, user, onSave, onClose, onDelete}) {
  const [form, setForm] = useState(order);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const isMgr = user.role==="manager";
  const isOwner = form.operatorId===user.id;
  const canEdit = isMgr || isOwner;
  const isNew = !order._saved;

  const estRun   = form.quantity&&form.timePerPiece ? (+form.quantity * +form.timePerPiece/60).toFixed(1) : null;
  const estTotal = form.quantity&&form.timePerPiece ? ((+form.quantity * +form.timePerPiece + +(form.setupTime||0))/60).toFixed(1) : null;

  const Field = ({label:lbl, children, col="span 2"}) => (
    <div style={{marginBottom:"13px", gridColumn:col}}>
      <label style={S.lbl}>{lbl}</label>
      {children}
    </div>
  );

  return (
    <div style={{position:"fixed", inset:0, background:"#00000090", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#161b22", border:"1px solid #30363d", borderRadius:"12px", width:"min(580px,95vw)", maxHeight:"92vh", overflowY:"auto", padding:"26px", boxShadow:"0 24px 48px #00000080"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px"}}>
          <div>
            <h2 style={{margin:0, color:"#e6edf3", fontSize:"16px", fontWeight:700, fontFamily:"'Rajdhani',sans-serif", letterSpacing:"0.06em"}}>
              {isNew?"NEW PRODUCTION ORDER":`ORDER ${form.orderNum||"—"}`}
            </h2>
            {!isNew&&<div style={{color:"#8b949e", fontSize:"11px", marginTop:"2px"}}>by {opName(form.operatorId)}</div>}
          </div>
          <button onClick={onClose} style={{background:"none", border:"none", color:"#8b949e", cursor:"pointer", fontSize:"20px"}}>✕</button>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px"}}>
          <Field label="Order #" col="span 1"><input style={S.inp()} value={form.orderNum} onChange={e=>set("orderNum",e.target.value)} disabled={!canEdit} placeholder="PO-2024-001"/></Field>
          <Field label="Drawing / DRW" col="span 1"><input style={S.inp()} value={form.drw} onChange={e=>set("drw",e.target.value)} disabled={!canEdit} placeholder="DRW-A-042"/></Field>
          <Field label="Machine" col="span 1">
            <select style={S.inp()} value={form.machine} onChange={e=>set("machine",e.target.value)} disabled={!isMgr&&!isNew}>
              {MACHINES.map(m=><option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Status" col="span 1">
            <select style={S.inp()} value={form.status} onChange={e=>set("status",e.target.value)} disabled={!canEdit}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Operator" col="span 1">
            <select style={S.inp()} value={form.operatorId} onChange={e=>set("operatorId",e.target.value)} disabled={!isMgr}>
              {OPERATORS.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity (pcs)" col="span 1"><input style={S.inp()} type="number" value={form.quantity} onChange={e=>set("quantity",e.target.value)} disabled={!canEdit} placeholder="0"/></Field>
          <Field label="Setup Time (min)" col="span 1"><input style={S.inp()} type="number" value={form.setupTime} onChange={e=>set("setupTime",e.target.value)} disabled={!canEdit} placeholder="0"/></Field>
          <Field label="Time / Workpiece (min)" col="span 1"><input style={S.inp()} type="number" value={form.timePerPiece} onChange={e=>set("timePerPiece",e.target.value)} disabled={!canEdit} placeholder="0"/></Field>
          <Field label="Notes">
            <textarea style={{...S.inp(), resize:"vertical", minHeight:"68px"}} value={form.notes} onChange={e=>set("notes",e.target.value)} disabled={!canEdit} placeholder="Additional notes…"/>
          </Field>
        </div>
        {estTotal && (
          <div style={{background:"#0d1117", border:"1px solid #22d3ee22", borderRadius:"8px", padding:"12px 18px", marginBottom:"16px", display:"flex", gap:"28px"}}>
            <div><div style={{color:"#8b949e", fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase"}}>Est. Run</div><div style={{color:"#22d3ee", fontSize:"22px", fontWeight:700, fontFamily:"'Rajdhani',sans-serif"}}>{estRun}h</div></div>
            <div><div style={{color:"#8b949e", fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase"}}>Total w/ Setup</div><div style={{color:"#4ade80", fontSize:"22px", fontWeight:700, fontFamily:"'Rajdhani',sans-serif"}}>{estTotal}h</div></div>
          </div>
        )}
        <div style={{display:"flex", gap:"8px", justifyContent:"flex-end"}}>
          {isMgr&&onDelete&&<button onClick={()=>onDelete(form.id)} style={S.btn.danger}>Delete</button>}
          <button onClick={onClose} style={S.btn.ghost}>Cancel</button>
          {canEdit&&<button onClick={()=>onSave({...form, _saved:true, updatedAt:new Date().toISOString()})} style={S.btn.primary}>Save Order</button>}
        </div>
      </div>
    </div>
  );
}

function Card({order, onClick}) {
  const c = STATUS_CONFIG[order.status];
  return (
    <div onClick={onClick} style={{background:"#161b22", border:`1px solid ${c.color}33`, borderLeft:`3px solid ${c.color}`, borderRadius:"6px", padding:"10px 12px", cursor:"pointer", marginBottom:"7px", transition:"background 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.background="#1c2128"}
      onMouseLeave={e=>e.currentTarget.style.background="#161b22"}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"5px"}}>
        <span style={{color:"#e6edf3", fontWeight:700, fontSize:"13px", fontFamily:"'Rajdhani',sans-serif"}}>{order.orderNum||"—"}</span>
        <StatusBadge status={order.status}/>
      </div>
      <div style={{color:"#8b949e", fontSize:"11px", marginBottom:"3px"}}>DRW: <span style={{color:"#c9d1d9"}}>{order.drw||"—"}</span></div>
      <div style={{display:"flex", gap:"10px", flexWrap:"wrap"}}>
        {order.quantity&&<div style={{color:"#8b949e", fontSize:"11px"}}>Qty: <span style={{color:"#c9d1d9"}}>{order.quantity}</span></div>}
        {order.setupTime&&<div style={{color:"#8b949e", fontSize:"11px"}}>Setup: <span style={{color:"#c9d1d9"}}>{order.setupTime}m</span></div>}
        {order.timePerPiece&&<div style={{color:"#8b949e", fontSize:"11px"}}>T/pc: <span style={{color:"#c9d1d9"}}>{order.timePerPiece}m</span></div>}
      </div>
      <div style={{color:"#8b949e", fontSize:"11px", marginTop:"4px"}}>👤 {opName(order.operatorId)}</div>
    </div>
  );
}

function MachineCol({machine, orders, onCard, compact}) {
  const active = orders.filter(o=>o.status==="Running").length;
  return (
    <div style={{background:"#0d1117", border:"1px solid #21262d", borderRadius:"10px", display:"flex", flexDirection:"column", minHeight:compact?0:260, overflow:"hidden"}}>
      <div style={{padding:compact?"9px 12px":"11px 14px", borderBottom:"1px solid #21262d", background:active>0?"#002d3322":"#161b22", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div style={{color:"#e6edf3", fontWeight:700, fontSize:"12px", fontFamily:"'Rajdhani',sans-serif", letterSpacing:"0.1em"}}>{machine.toUpperCase()}</div>
          <div style={{color:"#8b949e", fontSize:"10px"}}>{orders.length} orders</div>
        </div>
        {active>0&&<div style={{display:"flex", alignItems:"center", gap:"5px"}}><div style={{width:7, height:7, borderRadius:"50%", background:"#22d3ee", boxShadow:"0 0 6px #22d3ee"}}/>{!compact&&<span style={{color:"#22d3ee", fontSize:"10px", fontWeight:700}}>LIVE</span>}</div>}
      </div>
      <div style={{padding:"8px", flex:1}}>
        {orders.map(o=><Card key={o.id} order={o} onClick={()=>onCard(o)}/>)}
        {orders.length===0&&<div style={{color:"#30363d", fontSize:"11px", textAlign:"center", padding:"16px 0"}}>Empty</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState(()=>{
    try{return JSON.parse(localStorage.getItem("mill_orders_v3")||"[]");}catch{return [];}
  });
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMachine, setFilterMachine] = useState("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("board");

  useEffect(()=>{
    try{localStorage.setItem("mill_orders_v3",JSON.stringify(orders));}catch{}
  },[orders]);

  const isMgr = user?.role==="manager";
  const save = (form) => {
    setOrders(prev=>{ const ex=prev.find(o=>o.id===form.id); return ex?prev.map(o=>o.id===form.id?form:o):[...prev,form]; });
    setModal(null);
  };
  const del = (id) => { setOrders(prev=>prev.filter(o=>o.id!==id)); setModal(null); };

  const filtered = orders.filter(o=>{
    if(filterStatus!=="All"&&o.status!==filterStatus) return false;
    if(filterMachine!=="All"&&o.machine!==filterMachine) return false;
    if(search){const q=search.toLowerCase(); if(![o.orderNum,o.drw,opName(o.operatorId)].some(v=>v?.toLowerCase().includes(q))) return false;}
    return true;
  });

  const stats = {total:orders.length, running:orders.filter(o=>o.status==="Running").length, pending:orders.filter(o=>o.status==="Pending").length, done:orders.filter(o=>o.status==="Completed").length};
  const myOrders = user ? orders.filter(o=>o.operatorId===user.id) : [];

  if(!user) return <LoginScreen onLogin={setUser}/>;

  const selInp = (x={}) => S.inp({width:"auto", padding:"6px 10px", fontSize:"12px", ...x});

  return (
    <div style={{minHeight:"100vh", background:"#010409", fontFamily:"'Share Tech Mono','Courier New',monospace", color:"#e6edf3"}}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
      <div style={{borderBottom:"1px solid #21262d", padding:"0 18px", background:"#0d1117", display:"flex", alignItems:"center", justifyContent:"space-between", height:"54px", position:"sticky", top:0, zIndex:50, gap:"10px", flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
          <div style={{width:30, height:30, borderRadius:"7px", background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px"}}>⚙</div>
          <div>
            <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:"15px", fontWeight:700, letterSpacing:"0.1em"}}>MILL CONTROL</div>
            <div style={{fontSize:"9px", color:"#8b949e", letterSpacing:"0.08em"}}>PRODUCTION TRACKER</div>
          </div>
        </div>
        {isMgr && (
          <div style={{display:"flex", gap:"18px"}}>
            {[{l:"TOTAL",v:stats.total,c:"#8b949e"},{l:"RUNNING",v:stats.running,c:"#22d3ee"},{l:"PENDING",v:stats.pending,c:"#f59e0b"},{l:"DONE",v:stats.done,c:"#4ade80"}].map(s=>(
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{color:s.c, fontWeight:700, fontSize:"18px", fontFamily:"'Rajdhani',sans-serif"}}>{s.v}</div>
                <div style={{color:"#6b7280", fontSize:"9px", letterSpacing:"0.06em"}}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
        {!isMgr && (
          <div style={{display:"flex", gap:"16px"}}>
            {[{l:"MY ORDERS",v:myOrders.length,c:"#8b949e"},{l:"RUNNING",v:myOrders.filter(o=>o.status==="Running").length,c:"#22d3ee"},{l:"DONE",v:myOrders.filter(o=>o.status==="Completed").length,c:"#4ade80"}].map(s=>(
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{color:s.c, fontWeight:700, fontSize:"18px", fontFamily:"'Rajdhani',sans-serif"}}>{s.v}</div>
                <div style={{color:"#6b7280", fontSize:"9px", letterSpacing:"0.06em"}}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
          <div style={{color:"#8b949e", fontSize:"11px"}}>{isMgr?"🔐 Manager":`👤 ${user.name}`}</div>
          {isMgr&&<button onClick={()=>exportCSV(orders)} style={S.btn.green}>↓ CSV</button>}
          <button onClick={()=>setUser(null)} style={{...S.btn.ghost, fontSize:"11px", padding:"5px 12px"}}>Logout</button>
          <button onClick={()=>setModal(blankOrder(user.id))} style={{...S.btn.primary, fontSize:"11px", padding:"6px 14px"}}>+ NEW ORDER</button>
        </div>
      </div>
      <div style={{padding:"10px 18px", borderBottom:"1px solid #21262d", background:"#0d1117", display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, DRW, operator…" style={selInp({width:"200px"})}/>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={selInp()}>
          <option>All</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={filterMachine} onChange={e=>setFilterMachine(e.target.value)} style={selInp()}>
          <option>All</option>{MACHINES.map(m=><option key={m}>{m}</option>)}
        </select>
        {isMgr&&(
          <div style={{marginLeft:"auto", display:"flex", gap:"4px"}}>
            {["board","list"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{background:view===v?"#1d4ed8":"none", border:"1px solid "+(view===v?"#1d4ed8":"#30363d"), color:view===v?"#fff":"#8b949e", borderRadius:"5px", padding:"5px 10px", cursor:"pointer", fontSize:"11px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em"}}>
                {v==="board"?"⬛ Board":"☰ List"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{padding:"16px 18px"}}>
        {!isMgr&&(
          <>
            <div style={{marginBottom:"24px"}}>
              <div style={{...S.lbl, marginBottom:"10px"}}>My Orders</div>
              {myOrders.length===0&&(
                <div style={{color:"#30363d", fontSize:"13px", padding:"24px", textAlign:"center", border:"1px dashed #21262d", borderRadius:"8px"}}>No orders yet — click + NEW ORDER to add one</div>
              )}
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"8px"}}>
                {myOrders.filter(o=>{
                  if(filterStatus!=="All"&&o.status!==filterStatus) return false;
                  if(filterMachine!=="All"&&o.machine!==filterMachine) return false;
                  return true;
                }).map(o=><Card key={o.id} order={o} onClick={()=>setModal(o)}/>)}
              </div>
            </div>
            <div>
              <div style={{...S.lbl, marginBottom:"10px"}}>Shop Floor Overview (read-only)</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px", overflowX:"auto", minWidth:"560px"}}>
                {MACHINES.map(m=>(
                  <MachineCol key={m} machine={m} orders={filtered.filter(o=>o.machine===m)} onCard={setModal} compact/>
                ))}
              </div>
            </div>
          </>
        )}
        {isMgr&&view==="board"&&(
          <div style={{display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"12px", minWidth:"900px", overflowX:"auto"}}>
            {MACHINES.map(m=>(
              <MachineCol key={m} machine={m} orders={filtered.filter(o=>o.machine===m)} onCard={setModal}/>
            ))}
          </div>
        )}
        {isMgr&&view==="list"&&(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", fontSize:"12px"}}>
              <thead>
                <tr style={{borderBottom:"1px solid #21262d"}}>
                  {["Order #","DRW","Machine","Status","Operator","Qty","Setup","T/pc","Est. Total","Updated"].map(h=>(
                    <th key={h} style={{padding:"8px 12px", color:"#8b949e", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", fontSize:"10px", textAlign:"left", whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o=>{
                  const total = o.quantity&&o.timePerPiece?((+o.quantity * +o.timePerPiece + +(o.setupTime||0))/60).toFixed(1)+"h":"—";
                  return (
                    <tr key={o.id} onClick={()=>setModal(o)} style={{borderBottom:"1px solid #161b22", cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#161b22"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"9px 12px", color:"#e6edf3", fontWeight:700}}>{o.orderNum||"—"}</td>
                      <td style={{padding:"9px 12px", color:"#c9d1d9"}}>{o.drw||"—"}</td>
                      <td style={{padding:"9px 12px", color:"#c9d1d9"}}>{o.machine}</td>
                      <td style={{padding:"9px 12px"}}><StatusBadge status={o.status}/></td>
                      <td style={{padding:"9px 12px", color:"#c9d1d9"}}>{opName(o.operatorId)}</td>
                      <td style={{padding:"9px 12px", color:"#c9d1d9"}}>{o.quantity||"—"}</td>
                      <td style={{padding:"9px 12px", color:"#c9d1d9"}}>{o.setupTime?o.setupTime+"m":"—"}</td>
                      <td style={{padding:"9px 12px", color:"#c9d1d9"}}>{o.timePerPiece?o.timePerPiece+"m":"—"}</td>
                      <td style={{padding:"9px 12px", color:"#22d3ee", fontWeight:700}}>{total}</td>
                      <td style={{padding:"9px 12px", color:"#6b7280", fontSize:"11px"}}>{new Date(o.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={10} style={{textAlign:"center", color:"#30363d", padding:"40px"}}>No orders found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal&&(
        <OrderModal order={modal} user={user} onSave={save} onClose={()=>setModal(null)}
          onDelete={isMgr&&orders.find(o=>o.id===modal.id)?del:null}/>
      )}
    </div>
  );
}