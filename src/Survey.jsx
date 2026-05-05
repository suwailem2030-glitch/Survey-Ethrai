import { useState, useCallback, useMemo } from "react";

// ⚠️ رابط Google Apps Script الخاص بك
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyCO5oEst4a_gBhSQKsjQBGlzWXWz3_pVZv8UXtODRmSk_m7QrHN5HajHG4wgcLdOIxxA/exec";

const MAX_EVAL = 4;

const PLATFORMS = {
  local: [
    { id: "ithraa", name: "إثرائي" },
    { id: "doroob", name: "دروب (Doroob)" },
    { id: "rwaq", name: "رواق" },
    { id: "edraak", name: "إدراك (Edraak)" },
    { id: "misk", name: "مسك" },
  ],
  global: [
    { id: "coursera", name: "Coursera" },
    { id: "udemy", name: "Udemy" },
    { id: "linkedin", name: "LinkedIn Learning" },
    { id: "edx", name: "edX" },
  ],
};
const ALL_PLATFORMS = [...PLATFORMS.local, ...PLATFORMS.global];

const LIKERT_5 = [
  { val: 1, label: "لا أوافق بشدة" },
  { val: 2, label: "لا أوافق" },
  { val: 3, label: "محايد" },
  { val: 4, label: "أوافق" },
  { val: 5, label: "أوافق بشدة" },
];

const BRAND_SENTIMENTS = [
  "إيجابي جداً — أتمنى أجربها",
  "إيجابي — سمعت عنها شيئاً جيداً",
  "محايد — ما عندي رأي كافٍ",
  "سلبي — سمعت أشياء غير مشجعة",
  "لا أعرف عنها شيئاً يكفي لأحكم",
];

const USAGE_PATTERNS = [
  "أستخدم المجاني فقط ولا أنوي الدفع",
  "بدأت مجاناً وأدفع أحياناً إذا وجدت ما يستحق",
  "أدفع مباشرة للبرامج التي تهمني",
  "لدي اشتراك ثابت في منصة واحدة أو أكثر",
];

const MONTHLY_PRICES = ["1 – 30 ريال", "31 – 60 ريال", "61 – 100 ريال", "101 – 150 ريال", "أكثر من 150 ريال"];

const DECISION_FACTORS = [
  "قوة الشهادة واعتراف سوق العمل بها",
  "السعر أو المجانية",
  "سمعة المنصة وموثوقيتها",
  "توصية من شخص أثق فيه",
  "متطلبات الترقية أو التطوير الوظيفي",
  "أسباب أخرى",
];

export default function Survey() {
  const [section, setSection] = useState(0);
  const [answers, setAnswers] = useState({
    q1: null, q3: [], q5: {}, evalPicks: [], q6: {},
    maxMonthly: null, q16: null,
    q9: null, q10: null, q18: null,
  });
  const [evalIndex, setEvalIndex] = useState(0);
  const [disqualified, setDisqualified] = useState(false);
  const [shake, setShake] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = useCallback((k, v) => setAnswers(p => ({ ...p, [k]: v })), []);
  const setNested = useCallback((k, sk, v) => setAnswers(p => ({ ...p, [k]: { ...p[k], [sk]: v } })), []);
  const setDeep = useCallback((k, sk, f, v) => setAnswers(p => ({
    ...p, [k]: { ...p[k], [sk]: { ...(p[k]?.[sk] || {}), [f]: v } },
  })), []);

  const knownPlatforms = useMemo(() => ALL_PLATFORMS.filter(p => answers.q3.includes(p.id)), [answers.q3]);
  const needsPicker = knownPlatforms.length > MAX_EVAL;

  const evalPlatforms = useMemo(() => {
    if (!needsPicker) return knownPlatforms;
    return knownPlatforms.filter(p => answers.evalPicks.includes(p.id));
  }, [knownPlatforms, answers.evalPicks, needsPicker]);

  const evalUsed = useMemo(() => evalPlatforms.filter(p => { const t = answers.q5[p.id]; return t === "tried" || t === "regular"; }), [evalPlatforms, answers.q5]);
  const evalHeard = useMemo(() => evalPlatforms.filter(p => answers.q5[p.id] === "heard"), [evalPlatforms, answers.q5]);
  const allEval = useMemo(() => [...evalHeard, ...evalUsed], [evalHeard, evalUsed]);
  const cur = allEval[evalIndex];

  const SECTIONS = [
    { id: "welcome", title: "مرحباً" },
    { id: "filter", title: "التصفية والوعي" },
    { id: "depth", title: "عمق الاستخدام" },
    { id: "eval", title: "تقييم المنصات" },
    { id: "general", title: "أسئلة عامة" },
    { id: "compare", title: "المقارنة والتفضيل" },
    { id: "demo", title: "معلومات عامة" },
    { id: "thanks", title: "شكراً" },
  ];
  const last = SECTIONS.length - 1;
  const progress = Math.round((section / last) * 100);
  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const canNext = () => {
    switch (section) {
      case 0: return true;
      case 1: {
        if (answers.q1 === "once" || answers.q1 === "never") return true;
        return answers.q1 !== null && answers.q3.length > 0;
      }
      case 2: {
        if (!knownPlatforms.every(p => answers.q5[p.id])) return false;
        if (needsPicker && answers.evalPicks.length < MAX_EVAL) return false;
        return true;
      }
      case 3: {
        if (!cur) return true;
        const d = answers.q6[cur.id] || {};
        if (answers.q5[cur.id] === "heard") return !!d.sentiment;
        return d.value != null && d.price != null;
      }
      case 4: return answers.maxMonthly !== null && answers.q16 !== null;
      case 5: return answers.q9 !== null && answers.q10 !== null;
      case 6: return answers.q18 !== null;
      default: return true;
    }
  };

  const submitSurvey = async () => {
    setIsSubmitting(true);
    try {
      fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          q1_تجربة_التعلم: answers.q1,
          q3_المنصات: answers.q3.join(", "),
          q5_عمق_الاستخدام: JSON.stringify(answers.q5),
          q6_التقييمات: JSON.stringify(answers.q6),
          q7_الحد_الشهري: answers.maxMonthly,
          q8_نمط_الاستخدام: answers.q16,
          q9_المنصة_المفضلة: answers.q9,
          q10_عامل_القرار: answers.q10,
          q18_القطاع: answers.q18,
        }),
      });
    } catch (e) {
      console.log("submitted");
    }
    setSection(s => Math.min(s + 1, last));
    setIsSubmitting(false);
  };

  const handleNext = () => {
    if (section === 1) {
      if (answers.q1 === "once" || answers.q1 === "never") { setDisqualified(true); return; }
      if (answers.q3.includes("none")) { setDisqualified(true); return; }
    }
    if (section === 3) {
      if (!canNext()) { doShake(); return; }
      if (evalIndex < allEval.length - 1) { setEvalIndex(evalIndex + 1); return; }
    }
    if (section === 6) {
      if (!canNext()) { doShake(); return; }
      submitSurvey();
      return;
    }
    if (!canNext()) { doShake(); return; }
    setSection(s => Math.min(s + 1, last));
    if (section === 2) setEvalIndex(0);
  };

  const handlePrev = () => {
    if (section === 3 && evalIndex > 0) { setEvalIndex(evalIndex - 1); return; }
    setSection(s => Math.max(s - 1, 0));
  };

  const toggleEvalPick = (id) => {
    const picks = answers.evalPicks;
    if (picks.includes(id)) {
      set("evalPicks", picks.filter(x => x !== id));
    } else if (picks.length < MAX_EVAL) {
      set("evalPicks", [...picks, id]);
    }
  };

  /* ═══ مكونات ═══ */

  const Radio = ({ value, options, onChange }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((opt, i) => {
        const v = typeof opt === "string" ? opt : opt.val;
        const l = typeof opt === "string" ? opt : opt.label;
        const s = value === v;
        return (
          <button key={i} onClick={() => onChange(v)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10,
            border: s ? "2px solid #0D9488" : "1.5px solid #E5E7EB", background: s ? "#F0FDFA" : "#fff",
            cursor: "pointer", textAlign: "right", fontSize: 14, fontFamily: "inherit",
          }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: s ? "6px solid #0D9488" : "2px solid #CBD5E1", flexShrink: 0 }} />
            <span style={{ color: "#1F2937" }}>{l}</span>
          </button>
        );
      })}
    </div>
  );

  const Checks = ({ values, options, onChange, columns = 1 }) => (
    <div style={{ display: "grid", gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : "1fr", gap: 8 }}>
      {options.map((opt, i) => {
        const v = typeof opt === "string" ? opt : opt.val;
        const l = typeof opt === "string" ? opt : opt.label;
        const c = values.includes(v);
        const isN = v === "none";
        return (
          <button key={i} onClick={() => {
            if (isN) { onChange(c ? [] : ["none"]); return; }
            onChange(c ? values.filter(x => x !== v) : [...values.filter(x => x !== "none"), v]);
          }} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10,
            border: c ? "2px solid #0D9488" : `1.5px solid ${isN ? "#FCA5A5" : "#E5E7EB"}`,
            background: c ? (isN ? "#FEF2F2" : "#F0FDFA") : "#fff",
            cursor: "pointer", textAlign: "right", fontSize: 13.5, fontFamily: "inherit",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 4, border: c ? "none" : `2px solid ${isN ? "#FCA5A5" : "#CBD5E1"}`,
              background: c ? (isN ? "#EF4444" : "#0D9488") : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 11, color: "#fff", fontWeight: 700,
            }}>{c ? "✓" : ""}</div>
            <span style={{ color: isN ? "#DC2626" : "#1F2937" }}>{l}</span>
          </button>
        );
      })}
    </div>
  );

  const Q = ({ num, text, sub, req = true }) => (
    <div style={{ marginBottom: 16 }}>
      <span style={{
        background: req ? "#0D9488" : "#94A3B8", color: "#fff", fontSize: 11, fontWeight: 700,
        padding: "3px 10px", borderRadius: 20, display: "inline-block", marginBottom: 6,
      }}>{req ? (num ? `س ${num} ✱` : "✱") : "اختياري"}</span>
      <p style={{ fontSize: 15.5, fontWeight: 600, color: "#111827", lineHeight: 1.7, margin: 0 }}>{text}</p>
      {sub && <p style={{ fontSize: 12.5, color: "#9CA3AF", margin: "4px 0 0", lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );

  const Header = ({ icon, title, subtitle }) => (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13.5, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>{subtitle}</p>}
    </div>
  );

  const Card = ({ children, style = {} }) => (
    <div style={{ background: "#fff", borderRadius: 14, padding: "22px 20px", border: "1px solid #F3F4F6", marginBottom: 16, ...style }}>{children}</div>
  );

  const LikertQ = ({ label, color, borderColor, statement, value, onChange }) => (
    <Card style={{ borderRight: `4px solid ${borderColor}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 12 }}>{label}</div>
      <p style={{ fontSize: 14, color: "#374151", margin: "0 0 14px", lineHeight: 1.7 }}>{statement}</p>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {LIKERT_5.map(l => (
          <button key={l.val} onClick={() => onChange(l.val)} style={{
            padding: "8px 4px", borderRadius: 8, fontSize: 11,
            border: value === l.val ? `2px solid ${borderColor}` : "1.5px solid #E5E7EB",
            background: value === l.val ? (borderColor === "#059669" ? "#F0FDF4" : "#EEF2FF") : "#fff",
            color: value === l.val ? borderColor : "#6B7280",
            fontWeight: value === l.val ? 700 : 400,
            cursor: "pointer", fontFamily: "inherit", flex: "1 1 0", minWidth: 0,
          }}>{l.label}</button>
        ))}
        <button onClick={() => onChange("na")} style={{
          padding: "8px 6px", borderRadius: 8, fontSize: 10,
          border: value === "na" ? "2px solid #94A3B8" : "1.5px solid #E5E7EB",
          background: value === "na" ? "#F8FAFC" : "#fff",
          color: "#94A3B8", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        }}>لا أستطيع التقييم</button>
      </div>
    </Card>
  );

  if (disqualified) {
    return (
      <Wrapper>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
          <h2 style={{ fontSize: 22, color: "#111827", marginBottom: 12 }}>شكراً لاهتمامك!</h2>
          <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.7 }}>
            للأسف، هذه الاستبانة تستهدف شريحة محددة ممن لديهم تجربة مع التعلم الذاتي الإلكتروني ويعرفون منصة واحدة على الأقل.
            <br />نقدّر وقتك ونتمنى لك التوفيق!
          </p>
        </div>
      </Wrapper>
    );
  }

  const renderSection = () => {
    switch (section) {
      case 0:
        return (
          <>
            <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18, margin: "0 auto 16px",
                background: "linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#fff",
              }}>📊</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>استبانة منصات التعلم الإلكتروني</h1>
              <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, maxWidth: 400, marginInline: "auto" }}>
                دراسة بحثية حول تجربة المستخدم السعودي مع منصات التدريب والتعلم الإلكتروني المحلية والعالمية
              </p>
            </div>
            <Card>
              <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.8 }}>
                <p style={{ margin: "0 0 12px" }}>⏱️ الوقت المتوقع: <strong>3 – 5 دقائق</strong></p>
                <p style={{ margin: "0 0 12px" }}>🔒 إجاباتك <strong>سرية تماماً</strong> وتُستخدم لأغراض البحث العلمي فقط</p>
                <p style={{ margin: 0 }}>📋 الاستبانة تتكيف مع إجاباتك — ستظهر لك فقط الأسئلة المناسبة لتجربتك</p>
              </div>
            </Card>
          </>
        );

      case 1:
        return (
          <>
            <Header icon="🔍" title="التصفية والوعي" subtitle="نتأكد أنك ضمن الشريحة المستهدفة" />
            <Card>
              <Q num={1} text="هل سبق لك التعلم الذاتي عبر الإنترنت؟"
                sub="نقصد البرامج المسجّلة والدورات الذاتية في المنصات التعليمية — وليس البث المباشر أو الحضوري" />
              <Radio value={answers.q1} onChange={v => set("q1", v)} options={[
                { val: "regular", label: "نعم، بشكل منتظم" },
                { val: "sometimes", label: "نعم، أحياناً" },
                { val: "once", label: "جربت مرة أو مرتين فقط" },
                { val: "never", label: "لا، لم أجرب" },
              ]} />
            </Card>
            {(answers.q1 === "regular" || answers.q1 === "sometimes") && (
              <Card>
                <Q num={2} text="من المنصات التالية، أيها سمعت عنها أو تعرف باسمها؟ (اختر كل ما ينطبق)" />
                <p style={{ fontSize: 12, color: "#0D9488", fontWeight: 600, margin: "0 0 8px" }}>المنصات السعودية والعربية</p>
                <Checks values={answers.q3} options={PLATFORMS.local.map(p => ({ val: p.id, label: p.name }))} onChange={v => set("q3", v)} columns={2} />
                <p style={{ fontSize: 12, color: "#0D9488", fontWeight: 600, margin: "16px 0 8px" }}>المنصات العالمية</p>
                <Checks values={answers.q3} options={PLATFORMS.global.map(p => ({ val: p.id, label: p.name }))} onChange={v => set("q3", v)} columns={2} />
                <div style={{ marginTop: 14 }}>
                  <Checks values={answers.q3} options={[{ val: "none", label: "لا أعرف أياً منها" }]} onChange={v => set("q3", v)} />
                </div>
              </Card>
            )}
          </>
        );

      case 2: {
        const tiers = [
          { val: "heard", label: "سمعت فقط", color: "#059669", bg: "#F0FDF4" },
          { val: "tried", label: "جربت قليلاً", color: "#0369A1", bg: "#EFF6FF" },
          { val: "regular", label: "بانتظام", color: "#7C3AED", bg: "#F5F3FF" },
        ];
        const allSet = knownPlatforms.every(p => answers.q5[p.id]);
        return (
          <>
            <Header icon="📊" title="عمق الاستخدام" subtitle="اضغط على الخانة المناسبة لكل منصة" />
            <Card style={{ padding: "16px 12px", overflow: "auto" }}>
              <Q num={3} text="لكل منصة اخترتها، حدد مستوى تجربتك معها:" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(3, 70px)", gap: 4, marginBottom: 4 }}>
                <div />
                {tiers.map(t => (
                  <div key={t.val} style={{
                    textAlign: "center", fontSize: 10.5, fontWeight: 700, color: t.color,
                    padding: "6px 2px", borderRadius: 6, background: t.bg,
                  }}>{t.label}</div>
                ))}
              </div>
              {knownPlatforms.map((p, idx) => (
                <div key={p.id} style={{
                  display: "grid", gridTemplateColumns: "1fr repeat(3, 70px)", gap: 4,
                  padding: "8px 0", borderTop: idx === 0 ? "1.5px solid #E5E7EB" : "1px solid #F3F4F6",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1F2937", paddingRight: 4 }}>{p.name}</span>
                  {tiers.map(t => {
                    const sel = answers.q5[p.id] === t.val;
                    return (
                      <button key={t.val} onClick={() => setNested("q5", p.id, t.val)} style={{
                        width: "100%", height: 36, borderRadius: 8, border: "none", cursor: "pointer",
                        background: sel ? t.color : "#F3F4F6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s", fontFamily: "inherit",
                      }}>
                        {sel && <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </Card>

            {allSet && needsPicker && (
              <Card style={{ borderRight: "4px solid #D97706", background: "#FFFBEB" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#92400E", margin: 0 }}>
                      اخترت {knownPlatforms.length} منصات — حدد {MAX_EVAL} للتقييم
                    </p>
                    <p style={{ fontSize: 12, color: "#A16207", margin: "2px 0 0", lineHeight: 1.5 }}>
                      عشان ما نطوّل عليك، اختر أهم {MAX_EVAL} منصات تبي تقيّمها بالتفصيل
                    </p>
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, marginBottom: 12,
                  background: answers.evalPicks.length >= MAX_EVAL ? "#D1FAE5" : "#FEF3C7",
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: answers.evalPicks.length >= MAX_EVAL ? "#059669" : "#D97706" }}>
                    {answers.evalPicks.length}
                  </span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>من {MAX_EVAL}</span>
                  {answers.evalPicks.length >= MAX_EVAL && <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>✓ جاهز</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {knownPlatforms.map(p => {
                    const ch = answers.evalPicks.includes(p.id);
                    const mx = answers.evalPicks.length >= MAX_EVAL && !ch;
                    return (
                      <button key={p.id} onClick={() => toggleEvalPick(p.id)} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10,
                        border: ch ? "2px solid #0D9488" : "1.5px solid #E5E7EB",
                        background: ch ? "#F0FDFA" : mx ? "#F9FAFB" : "#fff",
                        cursor: mx ? "not-allowed" : "pointer", opacity: mx ? 0.45 : 1,
                        fontFamily: "inherit", fontSize: 14,
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 5, border: ch ? "none" : "2px solid #CBD5E1",
                          background: ch ? "#0D9488" : "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, color: "#fff", fontWeight: 700, flexShrink: 0,
                        }}>{ch ? "✓" : ""}</div>
                        <span style={{ color: "#1F2937", flex: 1 }}>{p.name}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                          {answers.q5[p.id] === "heard" ? "سمعت" : answers.q5[p.id] === "tried" ? "جربت" : "بانتظام"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        );
      }

      case 3: {
        if (!cur) return <Card style={{ textAlign: "center", padding: 40 }}><p style={{ color: "#6B7280" }}>لا توجد منصات لتقييمها.</p></Card>;
        const pid = cur.id;
        const tier = answers.q5[pid];
        const d = answers.q6[pid] || {};
        const isHeard = tier === "heard";
        return (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>المنصة {evalIndex + 1} من {allEval.length}</span>
              </div>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "4px 0", WebkitOverflowScrolling: "touch" }}>
                {allEval.map((p, i) => (
                  <div key={p.id} style={{
                    padding: "5px 14px", borderRadius: 20, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0,
                    background: i === evalIndex ? "#0D9488" : i < evalIndex ? "#D1FAE5" : "#F3F4F6",
                    color: i === evalIndex ? "#fff" : i < evalIndex ? "#059669" : "#9CA3AF",
                    fontWeight: i === evalIndex ? 700 : 400,
                  }}>{p.name} {i < evalIndex ? "✓" : ""}</div>
                ))}
              </div>
            </div>
            <Header
              icon={isHeard ? "👂" : "⭐"}
              title={`تقييم منصة ${cur.name}`}
              subtitle={isHeard ? "سمعت بها فقط — سؤال واحد سريع"
                : tier === "tried" ? "أجب بناءً على تجربتك المحدودة"
                : "قيّمها بناءً على تجربتك المستمرة"}
            />
            {isHeard ? (
              <Card>
                <Q num="" text={`ما انطباعك العام عن منصة ${cur.name} بناءً على ما سمعته؟`} />
                <Radio value={d.sentiment} onChange={v => setDeep("q6", pid, "sentiment", v)} options={BRAND_SENTIMENTS} />
              </Card>
            ) : (
              <>
                <LikertQ label="القيمة المضافة المُدركة" color="#059669" borderColor="#059669"
                  statement={`محتوى منصة ${cur.name} عالي الجودة`}
                  value={d.value} onChange={v => setDeep("q6", pid, "value", v)} />
                <LikertQ label="تقييم التكلفة" color="#6366F1" borderColor="#6366F1"
                  statement={`السعر قد يمنعني من الاشتراك أو الدفع في ${cur.name}`}
                  value={d.price} onChange={v => setDeep("q6", pid, "price", v)} />
                {pid === "ithraa" && (
                  <Card style={{ borderRight: "4px solid #0D9488" }}>
                    <Q num="" text="هل تستخدم منصة إثرائي بسبب متطلبات الترقية الوظيفية؟" />
                    <Radio
                      value={d.promotion}
                      onChange={v => setDeep("q6", pid, "promotion", v)}
                      options={["نعم", "لا"]}
                    />
                  </Card>
                )}
                <Card style={{ background: "#FAFAFA" }}>
                  <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 8px" }}>
                    ما الشيء الذي تتمنى تحسينه في {cur.name}؟ <span style={{ color: "#9CA3AF" }}>(اختياري)</span>
                  </p>
                  <textarea value={d.note || ""} onChange={e => setDeep("q6", pid, "note", e.target.value)}
                    placeholder="اكتب ملاحظتك هنا..." style={{
                      width: "100%", padding: 12, borderRadius: 10, fontSize: 13.5,
                      border: "1.5px solid #E5E7EB", fontFamily: "inherit", resize: "vertical",
                      minHeight: 60, direction: "rtl", outline: "none", boxSizing: "border-box",
                    }} />
                </Card>
              </>
            )}
          </>
        );
      }

      case 4:
        return (
          <>
            <Header icon="💰" title="أسئلة عامة" subtitle="استعدادك للدفع ونمط استخدامك" />
            <Card style={{ borderRight: "4px solid #D97706" }}>
              <Q num={4} text="ما أقصى اشتراك شهري يمكن أن تدفعه لمنصة تعلم إلكتروني؟" />
              <Radio value={answers.maxMonthly} onChange={v => set("maxMonthly", v)} options={MONTHLY_PRICES} />
            </Card>
            <Card>
              <Q num={5} text="ما النمط الذي يصف استخدامك لمنصات التعلم الإلكتروني؟" />
              <Radio value={answers.q16} onChange={v => set("q16", v)} options={USAGE_PATTERNS} />
            </Card>
          </>
        );

      case 5:
        return (
          <>
            <Header icon="⚖️" title="المقارنة والتفضيل" subtitle="لو ما عندك إلا خيار واحد..." />
            <Card>
              <Q num={6} text="إذا كنت ستشترك في منصة تدريب واحدة فقط لمدة سنة كاملة، أيها ستختار؟" />
              <Radio value={answers.q9} onChange={v => set("q9", v)} options={[
                ...knownPlatforms.map(p => ({ val: p.id, label: p.name })),
                { val: "undecided", label: "لم أحدد بعد" },
              ]} />
            </Card>
            <Card>
              <Q num={7} text="ما أهم عامل أثّر في اختيارك؟ (اختر واحداً فقط)" />
              <Radio value={answers.q10} onChange={v => set("q10", v)} options={DECISION_FACTORS} />
            </Card>
          </>
        );

      case 6:
        return (
          <>
            <Header icon="👤" title="معلومات عامة" subtitle="سؤال أخير لأغراض التحليل" />
            <Card>
              <Q num={8} text="ما القطاع الذي تنتمي إليه؟" />
              <Radio value={answers.q18} onChange={v => set("q18", v)} options={[
                "موظف قطاع حكومي", "موظف قطاع خاص", "طالب جامعي",
                "باحث عن عمل / خريج حديث", "HR أو مسؤول تدريب", "أعمال حرة / مستقل",
              ]} />
            </Card>
          </>
        );

      case 7:
        return (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#166534", margin: "0 0 12px" }}>شكراً لمشاركتك!</h2>
            <p style={{ fontSize: 14, color: "#166534", lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
              إجاباتك ستُسهم في دراسة علمية حول منصات التعلم الإلكتروني في السعودية.
            </p>
          </div>
        );
    }
  };

  return (
    <Wrapper>
      {section > 0 && section < last && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{SECTIONS[section].title}</span>
            <span style={{ fontSize: 11, color: "#9CA3AF", direction: "ltr" }}>{progress}%</span>
          </div>
          <div style={{ height: 6, background: "#F3F4F6", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #0D9488, #14B8A6)", borderRadius: 10, transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}
      <div style={{ animation: shake ? "shake 0.4s ease" : undefined }}>{renderSection()}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 24, paddingBottom: 20 }}>
        {section > 0 && section < last && (
          <button onClick={handlePrev} style={{
            flex: 1, padding: "13px 0", borderRadius: 12, fontSize: 14, fontWeight: 600,
            border: "1.5px solid #E5E7EB", background: "#fff", color: "#6B7280", cursor: "pointer", fontFamily: "inherit",
          }}>السابق</button>
        )}
        {section < last && (
          <button onClick={handleNext} disabled={isSubmitting} style={{
            flex: section === 0 ? 1 : 2, padding: "13px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
            border: "none",
            background: canNext() && !isSubmitting ? "linear-gradient(135deg, #0D9488, #14B8A6)" : "#E5E7EB",
            color: canNext() && !isSubmitting ? "#fff" : "#9CA3AF",
            cursor: canNext() && !isSubmitting ? "pointer" : "default",
            fontFamily: "inherit",
          }}>
            {section === 0 ? "ابدأ الاستبانة" :
              section === 3 && evalIndex < allEval.length - 1 ? "المنصة التالية →" :
              section === 6 ? (isSubmitting ? "⏳ جار الإرسال..." : "إرسال ✓") :
              "التالي"}
          </button>
        )}
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }`}</style>
    </Wrapper>
  );
}

function Wrapper({ children }) {
  return (
    <div style={{ direction: "rtl", fontFamily: "'Tajawal','Segoe UI',sans-serif", maxWidth: 520, margin: "0 auto", padding: "20px 16px", minHeight: "100vh", background: "#FAFAF8" }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
      {children}
    </div>
  );
}
