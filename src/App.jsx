/* eslint-disable */
import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBr-Vq8kDPrxNv8RojdrPa_GUgXth2tHmg",
  authDomain: "teamnight-d909b.firebaseapp.com",
  databaseURL: "https://teamnight-d909b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "teamnight-d909b",
  storageBucket: "teamnight-d909b.firebasestorage.app",
  messagingSenderId: "440378727824",
  appId: "1:440378727824:web:2c4bf51c6c57f8f7d96715"
};

let fdb = null;
try { fdb = getDatabase(initializeApp(firebaseConfig)); } catch (e) {}
const dbSet = (p, val) => { try { if (fdb) set(ref(fdb, p), val); } catch (e) {} };

const EDIT_PASSWORD = "004"; // 수정 비밀번호

const ZONES = ["상부", "하부", "B", "C", "D", "P", "T", "W", "Z"];
const ZONE_COLORS = {
  "상부": "#7c3aed", "하부": "#2563eb", "B": "#ea580c", "C": "#0891b2",
  "D": "#dc2626", "P": "#059669", "T": "#db2777", "W": "#65a30d", "Z": "#d97706",
};
const MACHINES = [1, 2];
const SHELF_NUMS = [1,2,3,4,5,6,7,8,9,10,11];
const FLOW_NUMS = [12,13,14,15,16,17,18,19,20];
const TYPE_NUMS = { "선반": SHELF_NUMS, "플로우": FLOW_NUMS };
const TYPES = ["선반", "플로우"];

try {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
  document.head.appendChild(fontLink);
} catch (e) {}

const initData = () => {
  try {
    const saved = localStorage.getItem("ons_data");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  const d = {};
  ZONES.forEach(z => {
    d[z] = {};
    MACHINES.forEach(m => {
      d[z][m] = {
        "선반": Array(11).fill(false),
        "플로우": Array(9).fill(false),
        flowPicking: false,
        shelfPicking: false,
      };
    });
  });
  return d;
};

function CircleProgress({ percent, color, size = 80 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.4s ease" }} />
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState(initData);
  const [activeZone, setActiveZone] = useState(ZONES[0]);
  const [activeMachine, setActiveMachine] = useState(1);
  const [copied, setCopied] = useState(false);
  const [editable, setEditable] = useState(() => {
    try { return localStorage.getItem("ons_editable") === "true"; } catch (e) { return false; }
  });
  const [showPwInput, setShowPwInput] = useState(false);
  const [pwValue, setPwValue] = useState("");

  const tryUnlock = () => {
    if (pwValue === EDIT_PASSWORD) {
      setEditable(true);
      try { localStorage.setItem("ons_editable", "true"); } catch (e) {}
      setShowPwInput(false); setPwValue("");
    } else {
      setPwValue("");
    }
  };

  const lockEdit = () => {
    setEditable(false);
    try { localStorage.setItem("ons_editable", "false"); } catch (e) {}
  };

  const [enabledMachines, setEnabledMachines] = useState(() => {
    try { const s = localStorage.getItem("ons_enabled_machines"); if (s) return JSON.parse(s); } catch (e) {}
    return { 1: true, 2: true };
  });

  const [calcMode, setCalcMode] = useState(() => {
    try { const s = localStorage.getItem("ons_calc_mode"); if (s) return s; } catch (e) {}
    return "합산"; // "합산" | "개별"
  });
  const toggleCalcMode = () => {
    const next = calcMode === "합산" ? "개별" : "합산";
    setCalcMode(next);
    try { localStorage.setItem("ons_calc_mode", next); } catch (e) {}
  };

  const toggleMachineEnabled = (m) => {
    const next = { ...enabledMachines, [m]: !enabledMachines[m] };
    setEnabledMachines(next);
    try { localStorage.setItem("ons_enabled_machines", JSON.stringify(next)); } catch (e) {}
  };

  const saveData = (newData) => { if (!editable) return;
    setData(newData);
    try { localStorage.setItem("ons_data", JSON.stringify(newData)); } catch (e) {} dbSet("ons/data", newData);
  };

  const toggleNum = (zone, machine, type, idx) => {
    const current = data[zone][machine][type];
    const len = TYPE_NUMS[type].length;
    const allChecked = current.slice(0, idx + 1).every(v => v);
    const newArr = [...current];
    if (allChecked) {
      for (let i = idx; i < len; i++) newArr[i] = false;
    } else {
      for (let i = 0; i <= idx; i++) newArr[i] = true;
    }
    saveData({ ...data, [zone]: { ...data[zone], [machine]: { ...data[zone][machine], [type]: newArr } } });
  };

  const togglePicking = (zone, machine, type) => {
    const pickKey = type === "플로우" ? "flowPicking" : "shelfPicking";
    const cur = data[zone][machine];
    const newVal = !(cur[pickKey] || false);
    saveData({ ...data, [zone]: { ...data[zone], [machine]: {
      ...cur,
      [pickKey]: newVal,
      [type]: newVal ? Array(TYPE_NUMS[type].length).fill(true) : cur[type],
    }}});
  };

  const [resetConfirm, setResetConfirm] = useState(false);

  const resetAll = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    const d = {};
    ZONES.forEach(z => {
      d[z] = {};
      MACHINES.forEach(m => {
        d[z][m] = { "선반": Array(11).fill(false), "플로우": Array(9).fill(false), flowPicking: false, shelfPicking: false };
      });
    });
    saveData(d);
    setResetConfirm(false);
  };

  const stats = useMemo(() => {
    const out = {};
    const activeMachines = MACHINES.filter(m => enabledMachines[m]);
    const cnt = activeMachines.length || 1;
    ZONES.forEach(z => {
      let flowDone = 0, shelfDone = 0;
      const flowTotal = cnt * FLOW_NUMS.length;
      const shelfTotal = cnt * SHELF_NUMS.length;
      activeMachines.forEach(m => {
        flowDone += (data[z][m]["플로우"]||[]).filter(v => v).length;
        shelfDone += (data[z][m]["선반"]||[]).filter(v => v).length;
      });
      out[z] = {
        flowDone, shelfDone, flowTotal, shelfTotal,
        flowPct: Math.round((flowDone / flowTotal) * 100),
        shelfPct: Math.round((shelfDone / shelfTotal) * 100),
        pct: Math.round(((flowDone + shelfDone) / (flowTotal + shelfTotal)) * 100),
      };
    });
    return out;
  }, [data, enabledMachines]);

  const machineTotals = useMemo(() => {
    const out = {};
    MACHINES.forEach(m => {
      let flowDone = 0, shelfDone = 0;
      ZONES.forEach(z => {
        flowDone += data[z][m]["플로우"].filter(v => v).length;
        shelfDone += data[z][m]["선반"].filter(v => v).length;
      });
      const flowTotal = ZONES.length * FLOW_NUMS.length;
      const shelfTotal = ZONES.length * SHELF_NUMS.length;
      out[m] = {
        flowDone, shelfDone, flowTotal, shelfTotal,
        flowPct: Math.round((flowDone / flowTotal) * 100),
        shelfPct: Math.round((shelfDone / shelfTotal) * 100),
      };
    });
    return out;
  }, [data]);


  // Firebase 실시간 구독
  useEffect(() => {
    if (!fdb) return;
    const subs = [];
    subs.push(onValue(ref(fdb, "ons/data"), snap => {
      const v = snap.val();
      if (v) {
        setData(v);
        try { localStorage.setItem("ons_data", JSON.stringify(v)); } catch (e) {}
      }
    }));
    return () => subs.forEach(u => u());
  }, []);

  const grand = useMemo(() => {
    const activeMachines = MACHINES.filter(m => enabledMachines[m]);
    if (calcMode === "개별") {
      // 호기별 각각 계산
      const machineStats = {};
      activeMachines.forEach(m => {
        let fDone = 0, sDone = 0;
        const total = ZONES.length * FLOW_NUMS.length;
        const sTotal = ZONES.length * SHELF_NUMS.length;
        ZONES.forEach(z => {
          fDone += data[z][m]["플로우"].filter(v=>v).length;
          sDone += data[z][m]["선반"].filter(v=>v).length;
        });
        machineStats[m] = {
          flowPct: Math.round((fDone / total) * 100),
          shelfPct: Math.round((sDone / sTotal) * 100),
          pct: Math.round(((fDone + sDone) / (total + sTotal)) * 100),
        };
      });
      const avgPct = Math.round(Object.values(machineStats).reduce((s,m)=>s+m.pct,0)/Object.keys(machineStats).length);
      return { machineStats, pct: avgPct };
    }
    // 합산 모드
    const cnt = activeMachines.length || 1;
    const flowTotal = ZONES.length * cnt * FLOW_NUMS.length;
    const shelfTotal = ZONES.length * cnt * SHELF_NUMS.length;
    let flowDone = 0, shelfDone = 0;
    ZONES.forEach(z => {
      activeMachines.forEach(m => {
        flowDone += data[z][m]["플로우"].filter(v=>v).length;
        shelfDone += data[z][m]["선반"].filter(v=>v).length;
      });
    });
    return {
      flowDone, shelfDone, flowTotal, shelfTotal,
      flowPct: Math.round((flowDone / flowTotal) * 100),
      shelfPct: Math.round((shelfDone / shelfTotal) * 100),
      pct: Math.round(((flowDone + shelfDone) / (flowTotal + shelfTotal)) * 100),
      machineStats: null,
    };
  }, [stats, enabledMachines, data, calcMode]);

  // 대시보드용 요약 실시간 전송
  useEffect(() => {
    dbSet("summary/ons", { pct: grand.pct, ts: Date.now() });
  }, [grand.pct]);

  const getSummaryText = () => {
    const now = new Date();
    const timeStr = `${now.getHours()}시${now.getMinutes().toString().padStart(2,"0")}분`;
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const lines = [
      `ONS (${timeStr})`,
      `${month}월${day}일자`,
      `──────────────`,
    ];

    MACHINES.filter(m => enabledMachines[m]).forEach(m => {
      lines.push(`ONS ${m}호기`);

      // 존별 상태 계산
      const zoneStatus = {};
      ZONES.forEach(z => {
        const flowPicking = data[z][m].flowPicking || false;
        const shelfPicking = data[z][m].shelfPicking || false;
        const flowArr = data[z][m]["플로우"];
        const shelfArr = data[z][m]["선반"];
        const flowDone = flowArr.filter(v=>v).length;
        const shelfDone = shelfArr.filter(v=>v).length;
        const flowAll = flowDone === FLOW_NUMS.length;
        const shelfAll = shelfDone === SHELF_NUMS.length;
        const lastFlowNum = flowDone > 0 ? FLOW_NUMS[flowDone - 1] : null;
        const lastShelfNum = shelfDone > 0 ? SHELF_NUMS[shelfDone - 1] : null;

        if ((flowPicking || flowAll) && (shelfPicking || shelfAll)) { zoneStatus[z] = "불출완료"; return; }
        if (flowDone === 0 && shelfDone === 0 && !flowPicking && !shelfPicking) { zoneStatus[z] = "미불출"; return; }

        let flowStatus = "";
        if (flowPicking || flowAll) flowStatus = "플로우 피킹완료";
        else if (flowDone > 0) flowStatus = `플로우 ${lastFlowNum}번 불출중`;

        let shelfStatus = "";
        if (shelfPicking || shelfAll) shelfStatus = "선반 피킹완료";
        else if (shelfDone > 0) shelfStatus = `선반 ${lastShelfNum}번 불출중`;

        zoneStatus[z] = [flowStatus, shelfStatus].filter(Boolean).join(" / ");
      });

      // 같은 상태끼리 묶기
      const statusGroups = {};
      ZONES.forEach(z => {
        const st = zoneStatus[z];
        if (!statusGroups[st]) statusGroups[st] = [];
        statusGroups[st].push(z);
      });

      const order = ["불출완료"];
      const sorted = Object.entries(statusGroups).sort(([a], [b]) => {
        const ai = order.indexOf(a) >= 0 ? order.indexOf(a) : a === "미불출" ? 999 : 50;
        const bi = order.indexOf(b) >= 0 ? order.indexOf(b) : b === "미불출" ? 999 : 50;
        return ai - bi;
      });

      sorted.forEach(([status, zones]) => {
        const names = zones.map(z => z.length<=1?z+"존":z).join("/");
        lines.push(`${names} : ${status}`);
      });
    });

    lines.push(`──────────────`);
    lines.push(`토탈 ${grand.pct}%`);
    return lines.join("\n");
  };

  const S = {
    bg: "#f0f4f8", card: "#ffffff", border: "#e2e8f0",
    text: "#0f172a", textSub: "#64748b", inputBg: "#f8fafc",
    shadow: "0 1px 8px rgba(0,0,0,0.08)", shadowMd: "0 2px 16px rgba(0,0,0,0.10)",
  };

  const activeColor = ZONE_COLORS[activeZone];

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "0.08em", background: "linear-gradient(135deg,#7c3aed,#0891b2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ONS</h1>
        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: S.textSub, textTransform: "uppercase", marginTop: 4, fontWeight: 500 }}>피킹 진행 현황</div>
        {/* 잠금 상태 */}
        <div style={{ marginTop: 10 }}>
          {editable ? (
            <button onClick={lockEdit} style={{ fontSize: 11, fontWeight: 700, padding: "5px 16px", borderRadius: 20, cursor: "pointer", background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", fontFamily: "inherit" }}>
              🔓 수정 가능 · 탭하여 잠금
            </button>
          ) : showPwInput ? (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
              <input type="password" inputMode="numeric" value={pwValue} autoFocus
                onChange={e => setPwValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && tryUnlock()}
                placeholder="비밀번호"
                style={{ width: 100, background: "#fff", border: "1.5px solid #7c3aed", borderRadius: 10, padding: "6px 10px", fontSize: 14, fontWeight: 700, outline: "none", textAlign: "center", fontFamily: "inherit" }} />
              <button onClick={tryUnlock} style={{ fontSize: 12, fontWeight: 800, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "#7c3aed", border: "none", color: "#fff", fontFamily: "inherit" }}>확인</button>
              <button onClick={() => { setShowPwInput(false); setPwValue(""); }} style={{ fontSize: 12, fontWeight: 700, padding: "7px 10px", borderRadius: 10, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8", fontFamily: "inherit" }}>취소</button>
            </div>
          ) : (
            <button onClick={() => setShowPwInput(true)} style={{ fontSize: 11, fontWeight: 700, padding: "5px 16px", borderRadius: 20, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8", fontFamily: "inherit" }}>
              🔒 보기 전용 · 탭하여 잠금해제
            </button>
          )}
        </div>
      </div>

                  {/* Grand Total */}
      {grand.machineStats ? (
        <div style={{ display:"flex", gap:10, marginBottom:16 }}>
          {MACHINES.filter(m => enabledMachines[m]).map(m => {
            const ms = grand.machineStats[m] || {};
            const color = m===1?"#7c3aed":"#0891b2";
            const grad = m===1?"linear-gradient(135deg,#7c3aed,#4f46e5)":"linear-gradient(135deg,#0891b2,#0e7490)";
            return (
              <div key={m} style={{ flex:1, background:grad, borderRadius:16, padding:"16px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, boxShadow:`0 4px 16px ${color}44` }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>{m}호기</div>
                <div style={{ position:"relative" }}>
                  <svg width={80} height={80} style={{ transform:"rotate(-90deg)" }}>
                    <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={6} />
                    <circle cx={40} cy={40} r={34} fill="none" stroke="#fff" strokeWidth={6}
                      strokeDasharray={`${((ms.pct||0)/100)*2*Math.PI*34} ${2*Math.PI*34}`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:17, fontWeight:800, color:"#fff" }}>{ms.pct||0}%</span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.8)", background:"rgba(255,255,255,0.15)", borderRadius:6, padding:"2px 6px" }}>플 {ms.flowPct||0}%</span>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.8)", background:"rgba(255,255,255,0.15)", borderRadius:6, padding:"2px 6px" }}>선 {ms.shelfPct||0}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "linear-gradient(135deg,#059669,#047857)", borderRadius: 16, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(5,150,105,0.25)" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>플로우 (12~20)</div>
            <div style={{ position: "relative" }}>
              <CircleProgress percent={grand.flowPct||0} color="#ffffff" size={80} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{grand.flowPct||0}%</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{grand.flowDone} / {grand.flowTotal}</div>
            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              {MACHINES.filter(m=>enabledMachines[m]).map(m => (
                <div key={m} style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{m}호기</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{machineTotals[m]?.flowPct||0}%</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, background: "linear-gradient(135deg,#0891b2,#0e7490)", borderRadius: 16, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(8,145,178,0.25)" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>선반 (1~11)</div>
            <div style={{ position: "relative" }}>
              <CircleProgress percent={grand.shelfPct||0} color="#ffffff" size={80} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{grand.shelfPct||0}%</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{grand.shelfDone} / {grand.shelfTotal}</div>
            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              {MACHINES.filter(m=>enabledMachines[m]).map(m => (
                <div key={m} style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{m}호기</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{machineTotals[m]?.shelfPct||0}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

{/* Zone Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {ZONES.map(z => {
          const { flowPct, shelfPct, pct } = stats[z];
          const isActive = z === activeZone;
          const color = ZONE_COLORS[z];
          return (
            <button key={z} onClick={() => setActiveZone(z)} style={{
              background: isActive ? color+"12" : S.card,
              border: `1.5px solid ${isActive ? color : S.border}`,
              borderRadius: 12, padding: "10px 6px", cursor: "pointer",
              textAlign: "center", boxShadow: S.shadow, transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 3 }}>{z} 존</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: S.text, marginBottom: 4 }}>{pct}%</div>
              <div style={{ height: 3, background: "#e2e8f0", borderRadius: 2, marginBottom: 4 }}>
                <div style={{ height: 3, borderRadius: 2, background: color, width: `${pct}%`, transition: "width 0.4s" }} />
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {MACHINES.map(m => {
                  const flowPicking = data[z][m].flowPicking || false;
                  const shelfPicking = data[z][m].shelfPicking || false;
                  const flowAll = data[z][m]["플로우"].every(v=>v);
                  const shelfAll = data[z][m]["선반"].every(v=>v);
                  const label = flowPicking && shelfPicking ? "완료" : flowPicking ? "플피킹" : shelfPicking ? "선피킹" : flowAll && shelfAll ? "불출" : "";
                  const bg = (flowPicking && shelfPicking) || (flowAll && shelfAll) ? "#dcfce7" : (flowPicking || shelfPicking) ? "#fef9c3" : "#f8fafc";
                  const color = (flowPicking && shelfPicking) || (flowAll && shelfAll) ? "#15803d" : (flowPicking || shelfPicking) ? "#a16207" : "#94a3b8";
                  const border = (flowPicking && shelfPicking) || (flowAll && shelfAll) ? "#86efac" : (flowPicking || shelfPicking) ? "#fde047" : "#e2e8f0";
                  return (
                    <div key={m} style={{ flex: 1, fontSize: 8, fontWeight: 700, padding: "2px 0", borderRadius: 5, textAlign: "center", background: bg, color, border: `1px solid ${border}` }}>
                      {m}호{label}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* 체크 패널 */}
      <div style={{ background: S.card, border: `1.5px solid ${activeColor}`, borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: S.shadowMd }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: activeColor }}>{activeZone} 존</div>
          <div style={{ display: "flex", gap: 8 }}>
            {MACHINES.map(m => (
              <button key={m} onClick={() => setActiveMachine(m)} style={{
                background: activeMachine === m ? (m === 1 ? "#7c3aed" : "#0891b2") : S.inputBg,
                border: `1px solid ${m === 1 ? "#7c3aed" : "#0891b2"}`,
                borderRadius: 8, padding: "5px 16px", cursor: "pointer",
                color: activeMachine === m ? "#fff" : S.textSub,
                fontSize: 12, fontWeight: 700, fontFamily: "inherit"
              }}>{m}호기</button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: S.textSub, marginBottom: 10, fontWeight: 500 }}>탭하면 해당 번호까지 누적 체크</div>

        {/* 피킹완료 버튼 - 플로우/선반 각각 */}
        {(() => {
          const cur = data[activeZone][activeMachine];
          const flowPicking = cur.flowPicking || false;
          const shelfPicking = cur.shelfPicking || false;
          const flowAll = cur["플로우"].every(v=>v);
          const shelfAll = cur["선반"].every(v=>v);
          const flowBul = flowAll && !flowPicking;
          const shelfBul = shelfAll && !shelfPicking;
          return (
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <button onClick={() => togglePicking(activeZone, activeMachine, "플로우")} style={{ flex:1, fontSize:11, fontWeight:800, padding:"8px 0", borderRadius:9, cursor:"pointer", transition:"all 0.15s", background:flowPicking?"#dcfce7":"#f8fafc", border:`1.5px solid ${flowPicking?"#86efac":"#e2e8f0"}`, color:flowPicking?"#15803d":"#94a3b8", fontFamily:"inherit" }}>
                {flowPicking ? "✓ 플 피킹완료" : "플로우 피킹완료"}
              </button>
              <button onClick={() => togglePicking(activeZone, activeMachine, "선반")} style={{ flex:1, fontSize:11, fontWeight:800, padding:"8px 0", borderRadius:9, cursor:"pointer", transition:"all 0.15s", background:shelfPicking?"#dcfce7":"#f8fafc", border:`1.5px solid ${shelfPicking?"#86efac":"#e2e8f0"}`, color:shelfPicking?"#15803d":"#94a3b8", fontFamily:"inherit" }}>
                {shelfPicking ? "✓ 선 피킹완료" : "선반 피킹완료"}
              </button>
            </div>
          );
        })()}

        {TYPES.map(type => {
          const nums = TYPE_NUMS[type];
          const checks = data[activeZone][activeMachine][type];
          const doneCnt = checks.filter(v => v).length;
          const typeColor = type === "플로우" ? "#059669" : "#0891b2";
          const cols = type === "선반" ? 11 : 9;
          return (
            <div key={type} style={{ marginBottom: type === "선반" ? 14 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: typeColor, background: typeColor+"12", border: `1px solid ${typeColor}33`, borderRadius: 7, padding: "3px 12px" }}>
                  {type} ({nums[0]}~{nums[nums.length-1]})
                </div>
                <div style={{ fontSize: 11, color: S.textSub }}>{doneCnt} / {nums.length} 완료</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 4 }}>
                {nums.map((n, idx) => {
                  const done = checks[idx];
                  return (
                    <button key={n} onClick={() => toggleNum(activeZone, activeMachine, type, idx)} style={{
                      background: done ? typeColor : S.inputBg,
                      border: `1.5px solid ${done ? typeColor : S.border}`,
                      borderRadius: 7, padding: "7px 2px", cursor: "pointer",
                      color: done ? "#fff" : S.textSub,
                      fontSize: 11, fontWeight: 700,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      transition: "all 0.15s", fontFamily: "inherit"
                    }}>
                      {n}
                      <span style={{ fontSize: 9 }}>{done ? "✓" : "·"}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, marginTop: 8 }}>
                <div style={{ height: 4, borderRadius: 2, background: typeColor, width: `${(doneCnt/nums.length)*100}%`, transition: "width 0.3s" }} />
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 12, background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: S.textSub, fontWeight: 500 }}>{activeZone} 존 {activeMachine}호기</div>
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>플로우 {data[activeZone][activeMachine]["플로우"].filter(v=>v).length}/9</span>
            <span style={{ fontSize: 12, color: "#0891b2", fontWeight: 700 }}>선반 {data[activeZone][activeMachine]["선반"].filter(v=>v).length}/11</span>
          </div>
        </div>
      </div>

      {/* 존별 요약 */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 16, boxShadow: S.shadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>존별 요약</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={toggleCalcMode} style={{ fontSize:10, fontWeight:800, padding:"4px 10px", borderRadius:8, cursor:"pointer", background:calcMode==="개별"?"#0f172a":"#f8fafc", border:"1px solid #e2e8f0", color:calcMode==="개별"?"#fff":"#64748b", fontFamily:"inherit", transition:"all 0.15s" }}>
              {calcMode}
            </button>
            {MACHINES.map(m => (
              <button key={m} onClick={() => toggleMachineEnabled(m)} style={{
                fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 8, cursor: "pointer",
                background: enabledMachines[m] ? (m===1?"#7c3aed":"#0891b2") : "#f8fafc",
                border: `1px solid ${m===1?"#7c3aed":"#0891b2"}`,
                color: enabledMachines[m] ? "#fff" : "#94a3b8",
                fontFamily: "inherit", transition: "all 0.15s"
              }}>
                {m}호기 {enabledMachines[m] ? "ON" : "OFF"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background: S.inputBg, borderRadius: 10, padding: "12px 14px", marginBottom: 10, fontSize: 12, lineHeight: 1.8, color: S.textSub, fontFamily: "monospace", whiteSpace: "pre-wrap", border: `1px solid ${S.border}` }}>
          {getSummaryText()}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(getSummaryText()).then(() => setCopied(true)); setTimeout(() => setCopied(false), 2000); }}
          style={{ width: "100%", background: copied ? "#059669" : "linear-gradient(135deg,#059669,#0891b2)", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 14, fontFamily: "inherit" }}>
          {copied ? "✓ 복사됨!" : "📤 현황 공유"}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ZONES.map(z => {
            const { flowPct, shelfPct } = stats[z];
            const totalPct = Math.round((flowPct + shelfPct) / 2);
            const color = ZONE_COLORS[z];
            return (
              <div key={z} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32 }}>{z.length<=1?z+"존":z}</div>
                <div style={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 4 }}>
                  <div style={{ height: 8, borderRadius: 4, background: `linear-gradient(90deg,${color},${color}88)`, width: `${totalPct}%`, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, minWidth: 40, textAlign: "right", color: totalPct===100?"#059669":S.text }}>{totalPct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={resetAll} style={{ width: "100%", background: resetConfirm ? "#fee2e2" : S.card, border: `1px solid ${resetConfirm ? "#dc2626" : "#fecaca"}`, borderRadius: 12, padding: "12px 0", cursor: "pointer", color: "#dc2626", fontSize: 13, fontWeight: 700, marginTop: 16, boxShadow: S.shadow, fontFamily: "inherit" }}>
        {resetConfirm ? "한 번 더 탭하면 초기화됩니다" : "🔄 전체 초기화"}
      </button>
    </div>
  );
}
