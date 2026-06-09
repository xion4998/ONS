/* eslint-disable */
import { useState, useMemo } from "react";

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

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
document.head.appendChild(fontLink);

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
        picking: false,
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

  const saveData = (newData) => {
    setData(newData);
    try { localStorage.setItem("ons_data", JSON.stringify(newData)); } catch (e) {}
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

  const togglePicking = (zone, machine) => {
    saveData({ ...data, [zone]: { ...data[zone], [machine]: { ...data[zone][machine], picking: !data[zone][machine].picking } } });
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
        d[z][m] = { "선반": Array(11).fill(false), "플로우": Array(9).fill(false), picking: false };
      });
    });
    saveData(d);
    setResetConfirm(false);
  };

  const stats = useMemo(() => {
    const out = {};
    ZONES.forEach(z => {
      let flowDone = 0, shelfDone = 0;
      const flowTotal = MACHINES.length * FLOW_NUMS.length;
      const shelfTotal = MACHINES.length * SHELF_NUMS.length;
      MACHINES.forEach(m => {
        flowDone += data[z][m]["플로우"].filter(v => v).length;
        shelfDone += data[z][m]["선반"].filter(v => v).length;
      });
      out[z] = {
        flowDone, shelfDone, flowTotal, shelfTotal,
        flowPct: Math.round((flowDone / flowTotal) * 100),
        shelfPct: Math.round((shelfDone / shelfTotal) * 100),
        pct: Math.round(((flowDone + shelfDone) / (flowTotal + shelfTotal)) * 100),
      };
    });
    return out;
  }, [data]);

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

  const grand = useMemo(() => {
    const flowTotal = ZONES.length * MACHINES.length * FLOW_NUMS.length;
    const shelfTotal = ZONES.length * MACHINES.length * SHELF_NUMS.length;
    const flowDone = ZONES.reduce((s, z) => s + stats[z].flowDone, 0);
    const shelfDone = ZONES.reduce((s, z) => s + stats[z].shelfDone, 0);
    return {
      flowDone, shelfDone, flowTotal, shelfTotal,
      flowPct: Math.round((flowDone / flowTotal) * 100),
      shelfPct: Math.round((shelfDone / shelfTotal) * 100),
      pct: Math.round(((flowDone + shelfDone) / (flowTotal + shelfTotal)) * 100),
    };
  }, [stats]);

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

    MACHINES.forEach(m => {
      TYPES.forEach(type => {
        const nums = TYPE_NUMS[type];
        lines.push(`[${m}호기 ${type}]`);

        const pickingZones = ZONES.filter(z => data[z][m].picking);
        const completed = ZONES.filter(z => !data[z][m].picking && data[z][m][type].filter(v=>v).length === nums.length);
        const inProgress = ZONES.filter(z => {
          if (data[z][m].picking) return false;
          const d = data[z][m][type].filter(v=>v).length;
          return d > 0 && d < nums.length;
        });
        const notStarted = ZONES.filter(z => !data[z][m].picking && data[z][m][type].every(v=>!v));

        // 전체 피킹완료
        if (pickingZones.length === ZONES.length) {
          lines.push(`  전체 피킹완료`);
        // 전체 불출완료
        } else if (completed.length === ZONES.length) {
          lines.push(`  전체 불출완료`);
        } else {
          if (pickingZones.length > 0) lines.push(`  🟡 ${pickingZones.map(z => z.length<=1?z+"존":z).join(", ")} 피킹완료`);
          if (completed.length > 0) lines.push(`  ✅ ${completed.map(z => z.length<=1?z+"존":z).join(", ")} 불출완료`);
          inProgress.forEach(z => {
            const checks = data[z][m][type];
            const doneCnt = checks.filter(v=>v).length;
            const lastNum = nums[doneCnt - 1];
            lines.push(`  🔄 ${z.length<=1?z+"존":z}  ${lastNum}번 불출중`);
          });
          if (notStarted.length > 0) lines.push(`  ⏳ 미시작  ${notStarted.map(z => z.length<=1?z+"존":z).join(", ")}`);
        }
      });
    });

    lines.push(`──────────────`);
    lines.push(`플로우 ${grand.flowPct}% / 선반 ${grand.shelfPct}%`);
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
      </div>

      {/* Grand Total */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {/* 플로우 */}
        <div style={{ flex: 1, background: "linear-gradient(135deg,#059669,#047857)", borderRadius: 16, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(5,150,105,0.25)" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>플로우 (12~20)</div>
          <div style={{ position: "relative" }}>
            <CircleProgress percent={grand.flowPct} color="#ffffff" size={80} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{grand.flowPct}%</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{grand.flowDone} / {grand.flowTotal}</div>
          <div style={{ display: "flex", gap: 6, width: "100%" }}>
            {MACHINES.map(m => (
              <div key={m} style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{m}호기</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{machineTotals[m].flowPct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* 선반 */}
        <div style={{ flex: 1, background: "linear-gradient(135deg,#0891b2,#0e7490)", borderRadius: 16, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(8,145,178,0.25)" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>선반 (1~11)</div>
          <div style={{ position: "relative" }}>
            <CircleProgress percent={grand.shelfPct} color="#ffffff" size={80} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{grand.shelfPct}%</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{grand.shelfDone} / {grand.shelfTotal}</div>
          <div style={{ display: "flex", gap: 6, width: "100%" }}>
            {MACHINES.map(m => (
              <div key={m} style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{m}호기</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{machineTotals[m].shelfPct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: "#059669", fontWeight: 600 }}>플 {flowPct}%</span>
                <span style={{ fontSize: 9, color: "#0891b2", fontWeight: 600 }}>선 {shelfPct}%</span>
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {MACHINES.map(m => {
                  const isPicking = data[z][m].picking;
                  const flowDone = data[z][m]["플로우"].filter(v=>v).length === FLOW_NUMS.length;
                  const shelfDone = data[z][m]["선반"].filter(v=>v).length === SHELF_NUMS.length;
                  const isBul = flowDone && shelfDone && !isPicking;
                  return (
                    <div key={m} style={{ flex: 1, fontSize: 8, fontWeight: 700, padding: "2px 0", borderRadius: 5, textAlign: "center", background: isBul?"#dcfce7":isPicking?"#fef9c3":"#f8fafc", color: isBul?"#15803d":isPicking?"#a16207":"#94a3b8", border: `1px solid ${isBul?"#86efac":isPicking?"#fde047":"#e2e8f0"}` }}>
                      {m}호{isBul?"불출":isPicking?"피킹":""}
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

        {/* 피킹완료 버튼 */}
        {(() => {
          const isPicking = data[activeZone][activeMachine].picking;
          const flowDone = data[activeZone][activeMachine]["플로우"].filter(v=>v).length;
          const shelfDone = data[activeZone][activeMachine]["선반"].filter(v=>v).length;
          const isBul = flowDone === FLOW_NUMS.length && shelfDone === SHELF_NUMS.length && !isPicking;
          return (
            <button onClick={() => togglePicking(activeZone, activeMachine)} style={{
              width: "100%", marginBottom: 12, fontSize: 12, fontWeight: 800,
              padding: "8px 0", borderRadius: 9, cursor: "pointer", transition: "all 0.15s",
              background: isBul ? "#dcfce7" : isPicking ? "#fef9c3" : "#f8fafc",
              border: `1.5px solid ${isBul ? "#86efac" : isPicking ? "#fde047" : "#e2e8f0"}`,
              color: isBul ? "#15803d" : isPicking ? "#a16207" : "#94a3b8", fontFamily: "inherit"
            }}>
              {isBul ? "✓ 불출완료" : isPicking ? "✓ 피킹완료" : "피킹완료 체크"}
            </button>
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
        <div style={{ fontSize: 13, fontWeight: 700, color: S.text, marginBottom: 12 }}>존별 요약</div>
        <div style={{ background: S.inputBg, borderRadius: 10, padding: "12px 14px", marginBottom: 10, fontSize: 12, lineHeight: 1.8, color: S.textSub, fontFamily: "monospace", whiteSpace: "pre-wrap", border: `1px solid ${S.border}` }}>
          {getSummaryText()}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(getSummaryText()).then(() => setCopied(true)); setTimeout(() => setCopied(false), 2000); }}
          style={{ width: "100%", background: copied ? "#059669" : "linear-gradient(135deg,#059669,#0891b2)", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 14, fontFamily: "inherit" }}>
          {copied ? "✓ 복사됨!" : "📤 현황 공유"}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ZONES.map(z => {
            const { flowDone, shelfDone, flowTotal, shelfTotal, flowPct, shelfPct } = stats[z];
            return (
              <div key={z} style={{ background: S.inputBg, borderRadius: 10, padding: "8px 12px", border: `1px solid ${S.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ZONE_COLORS[z] }}>{z.length<=1?z+"존":z}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {MACHINES.map(m => (
                      <span key={m} style={{ fontSize: 10, color: m===1?"#7c3aed":"#0891b2", fontWeight: 600 }}>
                        {m}호기 플{Math.round((data[z][m]["플로우"].filter(v=>v).length/9)*100)}% 선{Math.round((data[z][m]["선반"].filter(v=>v).length/11)*100)}%
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 9, color: "#059669", minWidth: 28, fontWeight: 600 }}>플로우</div>
                    <div style={{ flex: 1, height: 5, background: "#e2e8f0", borderRadius: 3 }}>
                      <div style={{ height: 5, borderRadius: 3, background: "#059669", width: `${flowPct}%`, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: flowPct===100?"#059669":S.text, minWidth: 32, textAlign: "right" }}>{flowPct}%</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 9, color: "#0891b2", minWidth: 28, fontWeight: 600 }}>선반</div>
                    <div style={{ flex: 1, height: 5, background: "#e2e8f0", borderRadius: 3 }}>
                      <div style={{ height: 5, borderRadius: 3, background: "#0891b2", width: `${shelfPct}%`, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: shelfPct===100?"#0891b2":S.text, minWidth: 32, textAlign: "right" }}>{shelfPct}%</div>
                  </div>
                </div>
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
