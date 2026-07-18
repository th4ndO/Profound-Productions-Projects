"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');`;

const COLS = [
  "Full Name",
  "Leader at 12",
  "Leader at 144",
  "Leader at 1728",
  "Address",
  "Mobile Number",
  "Email",
  "Event Name",
  "Event Type",
  "First Visit",
];

function formatPhone(raw) {
  if (raw === null || raw === undefined || raw === "") return "";
  let digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length === 9) digits = "0" + digits;
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return String(raw);
}

function formatDate(val) {
  if (!val) return "";
  let d = val;
  if (!(d instanceof Date)) {
    const parsed = new Date(val);
    if (isNaN(parsed.getTime())) return String(val);
    d = parsed;
  }
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toISODate(val) {
  if (!val) return null;
  let d = val;
  if (!(d instanceof Date)) {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function initials(name) {
  const clean = name.replace(/\(duplicate\)/gi, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalizeName(name) {
  return String(name || "")
    .replace(/\(duplicate\)/gi, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function analyzeEmail(raw) {
  const email = String(raw || "").trim();
  if (!email) return null;
  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basic.test(email)) return "Doesn't look like a valid email address";
  const domain = email.split("@")[1] || "";
  if (/\d{4,}/.test(domain)) return "Email looks like it has a phone number merged into it";
  const tldMatch = domain.match(/\.([a-zA-Z]+)$/);
  if (tldMatch) {
    const tld = tldMatch[1].toLowerCase();
    const commonTlds = ["com", "org", "net", "co", "za", "africa", "io", "edu", "gov"];
    if (!commonTlds.includes(tld) && levenshtein(tld, "com") === 1) {
      return `Domain ends in ".${tld}" — likely a typo of ".com"`;
    }
  }
  return null;
}

function analyzePhone(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const str = String(raw);
  if (/[a-zA-Z]/.test(str)) return "Phone number contains letters";
  const digits = str.replace(/[^0-9]/g, "");
  if (digits.length > 10) return "Phone number has extra digits — may have merged with another field";
  if (digits.length < 9) return "Phone number looks incomplete";
  return null;
}

function isVagueAddress(raw) {
  const address = String(raw || "").trim();
  if (!address) return false;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const hasNumber = /\d/.test(address);
  return parts.length <= 2 && !hasNumber;
}

const NODE_COLORS = ["#1F5C4A", "#2E7A63", "#E2A63B"];

const EVENT_TYPE_COLORS = {
  "Church Service": { dot: "#0F6E56", bg: "#E1F5EE", fg: "#085041" },
  Cell: { dot: "#534AB7", bg: "#EEEDFE", fg: "#3C3489" },
  Training: { dot: "#993C1D", bg: "#FAECE7", fg: "#4A1B0C" },
  Kids: { dot: "#993556", bg: "#FBEAF0", fg: "#72243E" },
};
const DEFAULT_TYPE_COLOR = { dot: "#888780", bg: "#F1EFE8", fg: "#444441" };

function typeColor(eventType) {
  return EVENT_TYPE_COLORS[eventType] || DEFAULT_TYPE_COLOR;
}

function NetworkMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="8" r="3.4" fill="#1F5C4A" />
      <circle cx="8" cy="24" r="2.6" fill="#2E7A63" />
      <circle cx="20" cy="24" r="2.6" fill="#2E7A63" />
      <circle cx="32" cy="24" r="2.6" fill="#2E7A63" />
      <circle cx="4" cy="35" r="1.7" fill="#E2A63B" />
      <circle cx="12" cy="35" r="1.7" fill="#E2A63B" />
      <circle cx="20" cy="35" r="1.7" fill="#E2A63B" />
      <circle cx="28" cy="35" r="1.7" fill="#E2A63B" />
      <circle cx="36" cy="35" r="1.7" fill="#E2A63B" />
      <line x1="20" y1="8" x2="8" y2="24" stroke="#C7CFC9" strokeWidth="1" />
      <line x1="20" y1="8" x2="20" y2="24" stroke="#C7CFC9" strokeWidth="1" />
      <line x1="20" y1="8" x2="32" y2="24" stroke="#C7CFC9" strokeWidth="1" />
      <line x1="8" y1="24" x2="4" y2="35" stroke="#DCC79A" strokeWidth="1" />
      <line x1="8" y1="24" x2="12" y2="35" stroke="#DCC79A" strokeWidth="1" />
      <line x1="20" y1="24" x2="20" y2="35" stroke="#DCC79A" strokeWidth="1" />
      <line x1="20" y1="24" x2="28" y2="35" stroke="#DCC79A" strokeWidth="1" />
      <line x1="32" y1="24" x2="36" y2="35" stroke="#DCC79A" strokeWidth="1" />
    </svg>
  );
}

export default function HouseSookooDataTracker() {
  const [datasets, setDatasets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [leader12, setLeader12] = useState("");
  const [leader144, setLeader144] = useState("");
  const [leader1728, setLeader1728] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventName, setEventName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [sortKey, setSortKey] = useState("Full Name");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(async (fileList) => {
    setLoading(true);
    setError("");
    const files = Array.from(fileList);
    const results = [];
    for (const file of files) {
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        let rows = [];
        wb.SheetNames.forEach((sn) => {
          const ws = wb.Sheets[sn];
          const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
          rows = rows.concat(json);
        });
        const cleaned = rows
          .filter((r) => {
            const name = String(r["Full Name"] || "").trim();
            return name && name.toLowerCase() !== "total";
          })
          .map((r, i) => {
            const emailIssue = analyzeEmail(r["Email"]);
            const phoneIssue = analyzePhone(r["Mobile Number"]);
            const addressVague = isVagueAddress(r["Address"]);
            const issues = [];
            if (emailIssue) issues.push({ type: "email", message: emailIssue });
            if (phoneIssue) issues.push({ type: "phone", message: phoneIssue });
            if (addressVague) issues.push({ type: "address", message: "Address is too vague to be useful (no street or number)" });
            return {
              id: `${file.name}-${i}`,
              source: file.name,
              "Full Name": String(r["Full Name"] || "").trim(),
              "Leader at 12": String(r["Leader at 12"] || "").trim(),
              "Leader at 144": String(r["Leader at 144"] || "").trim(),
              "Leader at 1728": String(r["Leader at 1728"] || "").trim(),
              Address: String(r["Address"] || "").trim(),
              "Mobile Number": r["Mobile Number"],
              Email: String(r["Email"] || "").trim(),
              "Event Name": String(r["Event Name"] || "").trim(),
              "Event Type": String(r["Event Type"] || "").trim(),
              "First Visit": r["First Visit"],
              isDuplicateFlag: /\(duplicate\)/i.test(String(r["Full Name"] || "")),
              issues,
            };
          });
        results.push({ name: file.name, count: cleaned.length, rows: cleaned });
      } catch (e) {
        setError(`Couldn't read "${file.name}" — make sure it's a valid Excel file.`);
      }
    }
    if (results.length) {
      setDatasets((prev) => {
        const names = new Set(prev.map((d) => d.name));
        const additions = results.filter((r) => !names.has(r.name));
        return [...prev, ...additions];
      });
    }
    setLoading(false);
  }, []);

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length) processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const allRows = useMemo(() => datasets.flatMap((d) => d.rows), [datasets]);

  const options = useMemo(() => {
    const mk = (key) =>
      Array.from(new Set(allRows.map((r) => r[key]).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      );
    return {
      leader12: mk("Leader at 12"),
      leader144: mk("Leader at 144"),
      leader1728: mk("Leader at 1728"),
      eventType: mk("Event Type"),
      eventName: mk("Event Name"),
    };
  }, [allRows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = allRows.filter((r) => {
      if (leader12 && r["Leader at 12"] !== leader12) return false;
      if (leader144 && r["Leader at 144"] !== leader144) return false;
      if (leader1728 && r["Leader at 1728"] !== leader1728) return false;
      if (eventType && r["Event Type"] !== eventType) return false;
      if (eventName && r["Event Name"] !== eventName) return false;
      const iso = toISODate(r["First Visit"]);
      if (dateFrom && (!iso || iso < dateFrom)) return false;
      if (dateTo && (!iso || iso > dateTo)) return false;
      if (onlyFlagged && (!r.issues || r.issues.length === 0)) return false;
      if (term) {
        const hay = [
          r["Full Name"],
          r["Email"],
          formatPhone(r["Mobile Number"]),
          r["Address"],
          r["Event Name"],
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    rows = rows.slice().sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "First Visit") {
        av = toISODate(av) || "";
        bv = toISODate(bv) || "";
      } else {
        av = String(av || "").toLowerCase();
        bv = String(bv || "").toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [allRows, search, leader12, leader144, leader1728, eventType, eventName, dateFrom, dateTo, onlyFlagged, sortKey, sortDir]);

  const stats = useMemo(() => {
    const dates = allRows.map((r) => toISODate(r["First Visit"])).filter(Boolean).sort();
    const dupCount = allRows.filter((r) => r.isDuplicateFlag).length;
    return {
      total: allRows.length,
      shown: filtered.length,
      leaders12: new Set(allRows.map((r) => r["Leader at 12"]).filter(Boolean)).size,
      events: new Set(allRows.map((r) => r["Event Name"]).filter(Boolean)).size,
      earliest: dates[0] || "—",
      latest: dates[dates.length - 1] || "—",
      duplicates: dupCount,
    };
  }, [allRows, filtered]);

  const eventSummary = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const key = r["Event Name"] || "(no event name)";
      if (!map.has(key)) map.set(key, { event: key, type: r["Event Type"] || "", people: new Set(), rows: 0 });
      const entry = map.get(key);
      entry.people.add(normalizeName(r["Full Name"]));
      entry.rows += 1;
    });
    const arr = Array.from(map.values()).map((e) => ({
      event: e.event,
      type: e.type,
      people: e.people.size,
      rows: e.rows,
    }));
    arr.sort((a, b) => b.people - a.people);
    return arr;
  }, [filtered]);

  const eventTypeSummary = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const key = r["Event Type"] || "(no type)";
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(normalizeName(r["Full Name"]));
    });
    return Array.from(map.entries())
      .map(([type, people]) => ({ type, people: people.size }))
      .sort((a, b) => b.people - a.people);
  }, [filtered]);

  const rostersByPerson = useMemo(() => {
    const map = new Map();
    allRows.forEach((r) => {
      const key = normalizeName(r["Full Name"]);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return map;
  }, [allRows]);

  const selectedRosters = useMemo(() => {
    if (!selected) return [];
    return rostersByPerson.get(normalizeName(selected["Full Name"])) || [];
  }, [selected, rostersByPerson]);

  const health = useMemo(() => {
    const emailIssues = allRows.filter((r) => r.issues.some((i) => i.type === "email"));
    const phoneIssues = allRows.filter((r) => r.issues.some((i) => i.type === "phone"));
    const addressIssues = allRows.filter((r) => r.issues.some((i) => i.type === "address"));
    const flaggedTotal = allRows.filter((r) => r.issues.length > 0).length;

    const uniqueNames = Array.from(rostersByPerson.keys());
    const fuzzyPairs = [];
    for (let i = 0; i < uniqueNames.length; i++) {
      for (let j = i + 1; j < uniqueNames.length; j++) {
        const a = uniqueNames[i];
        const b = uniqueNames[j];
        if (Math.abs(a.length - b.length) > 3) continue;
        const dist = levenshtein(a, b);
        const threshold = Math.min(a.length, b.length) <= 8 ? 1 : 2;
        if (dist > 0 && dist <= threshold) {
          fuzzyPairs.push({
            a: rostersByPerson.get(a)[0]["Full Name"],
            b: rostersByPerson.get(b)[0]["Full Name"],
            dist,
          });
        }
      }
    }

    return { emailIssues, phoneIssues, addressIssues, flaggedTotal, fuzzyPairs };
  }, [allRows, rostersByPerson]);

  const exportIssuesCSV = () => {
    const header = ["Full Name", "Issue type", "Issue", "Email", "Mobile Number", "Address", "Source file"];
    const escape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [header.join(",")];
    allRows.forEach((r) => {
      r.issues.forEach((iss) => {
        lines.push(
          [r["Full Name"], iss.type, iss.message, r["Email"], formatPhone(r["Mobile Number"]), r["Address"], r.source]
            .map(escape)
            .join(",")
        );
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-issues-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setLeader12("");
    setLeader144("");
    setLeader1728("");
    setEventType("");
    setEventName("");
    setDateFrom("");
    setDateTo("");
  };

  const removeDataset = (name) => {
    setDatasets((prev) => prev.filter((d) => d.name !== name));
  };

  const clearAll = () => {
    setDatasets([]);
    resetFilters();
    setSelected(null);
  };

  const exportCSV = () => {
    const header = COLS.concat(["Source file"]);
    const escape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const row = [
        r["Full Name"],
        r["Leader at 12"],
        r["Leader at 144"],
        r["Leader at 1728"],
        r["Address"],
        formatPhone(r["Mobile Number"]),
        r["Email"],
        r["Event Name"],
        r["Event Type"],
        formatDate(r["First Visit"]),
        r.source,
      ].map(escape);
      lines.push(row.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roster-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasData = datasets.length > 0;
  const activeFilterCount = [leader12, leader144, leader1728, eventType, eventName, dateFrom, dateTo, search].filter(
    Boolean
  ).length;

  const th = (label, key) => (
    <th
      onClick={() => toggleSort(key)}
      style={{
        cursor: "pointer",
        userSelect: "none",
        padding: "10px 12px",
        textAlign: "left",
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: "#5F6E67",
        whiteSpace: "nowrap",
        borderBottom: "1.5px solid #DEE3DC",
      }}
    >
      {label}
      <span style={{ marginLeft: 4, opacity: sortKey === key ? 1 : 0.25 }}>
        {sortKey === key && sortDir === "desc" ? "▾" : "▴"}
      </span>
    </th>
  );

  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        background: "#F4F5F0",
        minHeight: "100vh",
        color: "#14261F",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        * { box-sizing: border-box; }
        input, select, button { font-family: 'Inter', sans-serif; }
        input[type="text"], input[type="date"], select {
          border: 1px solid #DEE3DC;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 13.5px;
          background: #FFFFFF;
          color: #14261F;
          outline: none;
        }
        input[type="text"]:focus, input[type="date"]:focus, select:focus {
          border-color: #1F5C4A;
          box-shadow: 0 0 0 3px rgba(31,92,74,0.12);
        }
        button { cursor: pointer; }
        ::placeholder { color: #9AA59E; }
        .rowhover:hover { background: #EEF2ED !important; }
        @media (max-width: 760px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: flex !important; }
        }
        @media (min-width: 761px) {
          .mobile-cards { display: none !important; }
        }
      `,
        }}
      />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 80px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <NetworkMark />
          <div>
            <h1
              style={{
                fontFamily: "Fraunces, serif",
                fontWeight: 600,
                fontSize: 26,
                margin: 0,
                color: "#14261F",
              }}
            >
              House Sookoo Data Tracker
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 13.5, color: "#6B7A72" }}>
              Upload your data dumps, then search and filter the whole network in one place.
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              background: "#FCEBEB",
              border: "1px solid #F09595",
              color: "#791F1F",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            marginTop: 20,
            border: `1.5px dashed ${dragOver ? "#1F5C4A" : "#C7CFC9"}`,
            background: dragOver ? "#EAF1EC" : "#FFFFFF",
            borderRadius: 12,
            padding: hasData ? "16px 20px" : "40px 20px",
            textAlign: "center",
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            multiple
            onChange={handleInputChange}
            style={{ display: "none" }}
          />
          {!hasData ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                Drop your Excel files here
              </div>
              <div style={{ fontSize: 13, color: "#6B7A72", marginBottom: 16 }}>
                .xls or .xlsx — drop several data dumps at once, they'll be combined automatically
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: "#1F5C4A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 13.5,
                  fontWeight: 500,
                }}
              >
                Choose files
              </button>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 13, color: "#6B7A72" }}>
                {loading ? "Reading files…" : "Drop more files here, or"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #DEE3DC",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#14261F",
                  }}
                >
                  Add files
                </button>
                <button
                  onClick={clearAll}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #DEE3DC",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#993C1D",
                  }}
                >
                  Clear all data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loaded files chips */}
        {hasData && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {datasets.map((d) => (
              <div
                key={d.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#FFFFFF",
                  border: "1px solid #DEE3DC",
                  borderRadius: 999,
                  padding: "5px 6px 5px 12px",
                  fontSize: 12.5,
                  color: "#3F4B45",
                }}
              >
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
                  {d.name}
                </span>
                <span style={{ color: "#9AA59E" }}>· {d.count}</span>
                <button
                  onClick={() => removeDataset(d.name)}
                  aria-label={`Remove ${d.name}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#9AA59E",
                    fontSize: 15,
                    lineHeight: 1,
                    padding: "0 4px",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {hasData && (
          <>
            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginTop: 24,
              }}
            >
              {[
                ["Total records", stats.total],
                ["Matching filters", stats.shown],
                ["Leaders at 12", stats.leaders12],
                ["Groups & events", stats.events],
                ["Flagged duplicates", stats.duplicates],
                ["Earliest visit", stats.earliest],
                ["Latest visit", stats.latest],
              ].map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #DEE3DC",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "#6B7A72", marginBottom: 4 }}>{label}</div>
                  <div
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 19,
                      fontWeight: 500,
                      color: "#14261F",
                    }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Data health */}
            <div
              style={{
                marginTop: 20,
                background: "#FFFFFF",
                border: "1px solid #DEE3DC",
                borderRadius: 12,
                padding: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 15.5 }}>
                  Data health
                </div>
                {health.flaggedTotal > 0 && (
                  <button
                    onClick={exportIssuesCSV}
                    style={{
                      background: "transparent",
                      border: "1px solid #DEE3DC",
                      borderRadius: 8,
                      padding: "5px 12px",
                      fontSize: 12,
                      color: "#6B7A72",
                    }}
                  >
                    Export issues CSV
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#6B7A72", marginBottom: 14 }}>
                Automatic checks on emails, phone numbers, addresses, and near-duplicate names. Nothing
                is auto-fixed or auto-merged — this is a list to review by hand.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 10,
                  marginBottom: health.flaggedTotal > 0 || health.fuzzyPairs.length > 0 ? 16 : 0,
                }}
              >
                {[
                  ["Invalid emails", health.emailIssues.length, "#F7C1C1", "#791F1F"],
                  ["Phone issues", health.phoneIssues.length, "#F7C1C1", "#791F1F"],
                  ["Vague addresses", health.addressIssues.length, "#FAC775", "#633806"],
                  ["Possible name dupes", health.fuzzyPairs.length, "#FAC775", "#633806"],
                ].map(([label, val, bg, fg]) => (
                  <div
                    key={label}
                    style={{
                      background: bg,
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: fg, marginBottom: 3 }}>
                      {label}
                    </div>
                    <div
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 17,
                        fontWeight: 500,
                        color: fg,
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>

              {health.flaggedTotal > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#3F4B45", marginBottom: health.fuzzyPairs.length ? 14 : 0 }}>
                  <input
                    type="checkbox"
                    checked={onlyFlagged}
                    onChange={(e) => setOnlyFlagged(e.target.checked)}
                  />
                  Show only the {health.flaggedTotal} flagged record{health.flaggedTotal === 1 ? "" : "s"} in the table below
                </label>
              )}

              {health.fuzzyPairs.length > 0 && (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#3F4B45", marginBottom: 8 }}>
                    Names that look like typos of each other
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {health.fuzzyPairs.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 12.5,
                          color: "#3F4B45",
                          background: "#F7F8F5",
                          borderRadius: 6,
                          padding: "7px 10px",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          <strong style={{ fontWeight: 500 }}>{p.a}</strong> vs{" "}
                          <strong style={{ fontWeight: 500 }}>{p.b}</strong>
                        </span>
                        <span style={{ color: "#9AA59E", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                          {p.dist} char{p.dist === 1 ? "" : "s"} apart
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {health.flaggedTotal === 0 && health.fuzzyPairs.length === 0 && (
                <div style={{ fontSize: 12.5, color: "#6B7A72" }}>No issues found in the current data.</div>
              )}
            </div>

            {/* Filters */}
            <div
              style={{
                marginTop: 20,
                background: "#FFFFFF",
                border: "1px solid #DEE3DC",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Search name, email, phone, address…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: "1 1 240px", minWidth: 200 }}
                />
                <select value={leader12} onChange={(e) => setLeader12(e.target.value)} style={{ flex: "1 1 150px" }}>
                  <option value="">Leader @12 — any</option>
                  {options.leader12.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <select value={leader144} onChange={(e) => setLeader144(e.target.value)} style={{ flex: "1 1 150px" }}>
                  <option value="">Leader @144 — any</option>
                  {options.leader144.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <select value={leader1728} onChange={(e) => setLeader1728(e.target.value)} style={{ flex: "1 1 150px" }}>
                  <option value="">Leader @1728 — any</option>
                  {options.leader1728.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={{ flex: "1 1 150px" }}>
                  <option value="">Event type — any</option>
                  {options.eventType.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <select value={eventName} onChange={(e) => setEventName(e.target.value)} style={{ flex: "1 1 180px" }}>
                  <option value="">Event — any</option>
                  {options.eventName.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: 12.5, color: "#6B7A72" }}>
                  First visit from
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{ marginLeft: 8 }}
                  />
                </label>
                <label style={{ fontSize: 12.5, color: "#6B7A72" }}>
                  to
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{ marginLeft: 8 }}
                  />
                </label>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    style={{
                      background: "transparent",
                      border: "1px solid #DEE3DC",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12.5,
                      color: "#6B7A72",
                    }}
                  >
                    Reset filters ({activeFilterCount})
                  </button>
                )}
                <button
                  onClick={exportCSV}
                  style={{
                    marginLeft: "auto",
                    background: "#1F5C4A",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Export {stats.shown} to CSV
                </button>
              </div>
            </div>

            {/* Event roster sizes */}
            <div
              style={{
                marginTop: 20,
                background: "#FFFFFF",
                border: "1px solid #DEE3DC",
                borderRadius: 12,
                padding: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 15.5 }}>
                  People per event roster
                </div>
                <div style={{ fontSize: 11.5, color: "#9AA59E" }}>reflects current filters</div>
              </div>
              <div style={{ fontSize: 12, color: "#6B7A72", marginBottom: 12 }}>
                Each file is a roster snapshot, not a check-in log — this counts how many people are
                listed against each event or group, not how many times they showed up.
              </div>

              {eventTypeSummary.length > 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {eventTypeSummary.map((t) => {
                    const c = typeColor(t.type);
                    const active = eventType === t.type;
                    return (
                      <button
                        key={t.type}
                        onClick={() => setEventType(active ? "" : t.type)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          border: active ? `1px solid ${c.dot}` : "1px solid #DEE3DC",
                          background: active ? c.bg : "#FFFFFF",
                          color: active ? c.fg : "#3F4B45",
                          borderRadius: 999,
                          padding: "4px 11px",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
                        {t.type} · {t.people}
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(showAllEvents ? eventSummary : eventSummary.slice(0, 12)).map((e) => {
                  const max = eventSummary[0] ? eventSummary[0].people : 1;
                  const pct = max ? Math.round((e.people / max) * 100) : 0;
                  const c = typeColor(e.type);
                  return (
                    <div key={e.event} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                      <div
                        style={{
                          width: 180,
                          flexShrink: 0,
                          fontSize: 12.5,
                          color: "#3F4B45",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={e.event}
                      >
                        {e.event}
                      </div>
                      <div style={{ flex: 1, background: "#EEF2ED", borderRadius: 6, height: 20, position: "relative" }}>
                        <div
                          style={{
                            width: `${Math.max(pct, 3)}%`,
                            background: c.dot,
                            height: "100%",
                            borderRadius: 6,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          width: 40,
                          textAlign: "right",
                          flexShrink: 0,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {e.people}
                      </div>
                    </div>
                  );
                })}
                {eventSummary.length === 0 && (
                  <div style={{ fontSize: 13, color: "#9AA59E", padding: "8px 0" }}>
                    No events to show for the current filters.
                  </div>
                )}
                {eventSummary.length > 12 && (
                  <button
                    onClick={() => setShowAllEvents((v) => !v)}
                    style={{
                      alignSelf: "flex-start",
                      background: "transparent",
                      border: "none",
                      color: "#1F5C4A",
                      fontSize: 12.5,
                      fontWeight: 500,
                      padding: "4px 0",
                    }}
                  >
                    {showAllEvents ? "Show fewer" : `Show all ${eventSummary.length}`}
                  </button>
                )}
              </div>
            </div>

            {/* Desktop table */}
            <div
              className="desktop-table"
              style={{
                marginTop: 20,
                background: "#FFFFFF",
                border: "1px solid #DEE3DC",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div style={{ maxHeight: 560, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#F7F8F5", zIndex: 1 }}>
                    <tr>
                      {th("Name", "Full Name")}
                      {th("Leader @12", "Leader at 12")}
                      {th("Leader @144", "Leader at 144")}
                      {th("Leader @1728", "Leader at 1728")}
                      {th("Event", "Event Name")}
                      {th("Type", "Event Type")}
                      {th("First visit", "First Visit")}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr
                        key={r.id}
                        className="rowhover"
                        onClick={() => setSelected(r)}
                        style={{
                          cursor: "pointer",
                          background: i % 2 === 0 ? "#FFFFFF" : "#FBFCFA",
                          borderBottom: "1px solid #EDF0EC",
                        }}
                      >
                        <td style={{ padding: "9px 12px", fontSize: 13.5, fontWeight: 500 }}>
                          {r["Full Name"]}
                          {r.isDuplicateFlag && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10.5,
                                fontWeight: 600,
                                color: "#854F0B",
                                background: "#FAEEDA",
                                borderRadius: 999,
                                padding: "1px 7px",
                              }}
                            >
                              dup
                            </span>
                          )}
                          {r.issues.map((iss) => (
                            <span
                              key={iss.type}
                              title={iss.message}
                              style={{
                                marginLeft: 6,
                                fontSize: 10.5,
                                fontWeight: 600,
                                color: "#791F1F",
                                background: "#FCEBEB",
                                borderRadius: 999,
                                padding: "1px 7px",
                              }}
                            >
                              {iss.type}
                            </span>
                          ))}
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 13, color: "#3F4B45" }}>
                          {r["Leader at 12"]}
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 13, color: "#3F4B45" }}>
                          {r["Leader at 144"]}
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 13, color: "#3F4B45" }}>
                          {r["Leader at 1728"]}
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 13, color: "#3F4B45" }}>
                          {r["Event Name"]}
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 13, color: "#3F4B45" }}>
                          {r["Event Type"]}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            fontSize: 12.5,
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#6B7A72",
                          }}
                        >
                          {formatDate(r["First Visit"])}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: "40px 12px", textAlign: "center", color: "#9AA59E", fontSize: 13.5 }}>
                          No records match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="mobile-cards" style={{ flexDirection: "column", gap: 10, marginTop: 20 }}>
              {filtered.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelected(r)}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #DEE3DC",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 500, fontSize: 14.5 }}>
                      {r["Full Name"]}
                      {r.issues.length > 0 && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: "#791F1F",
                            background: "#FCEBEB",
                            borderRadius: 999,
                            padding: "1px 7px",
                          }}
                        >
                          {r.issues.length} issue{r.issues.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, fontFamily: "JetBrains Mono, monospace", color: "#6B7A72" }}>
                      {formatDate(r["First Visit"])}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#6B7A72", marginTop: 4 }}>
                    @12 {r["Leader at 12"] || "—"} · @144 {r["Leader at 144"] || "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "#9AA59E", marginTop: 2 }}>
                    {r["Event Name"]} · {r["Event Type"]}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: "30px 0", textAlign: "center", color: "#9AA59E", fontSize: 13.5 }}>
                  No records match these filters.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,38,31,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              maxWidth: 420,
              width: "100%",
              padding: 22,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#E1F5EE",
                  color: "#085041",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                {initials(selected["Full Name"])}
              </div>
              <div>
                <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 17 }}>
                  {selected["Full Name"]}
                </div>
                <div style={{ fontSize: 12, color: "#6B7A72" }}>{selected.source}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  fontSize: 20,
                  color: "#9AA59E",
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {[
              ["Mobile", formatPhone(selected["Mobile Number"])],
              ["Email", selected["Email"]],
              ["Address", selected["Address"]],
              ["First visit ever", formatDate(selected["First Visit"])],
            ].map(([label, val]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "9px 0",
                  borderBottom: "1px solid #EDF0EC",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#6B7A72" }}>{label}</span>
                <span style={{ textAlign: "right", color: "#14261F", wordBreak: "break-word" }}>
                  {val || "—"}
                </span>
              </div>
            ))}

            {selectedRosters.some((r) => r.issues.length > 0) && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#791F1F", marginBottom: 6 }}>
                  Data issues to review
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {selectedRosters.flatMap((r) => r.issues).map((iss, idx) => (
                    <div key={idx} style={{ fontSize: 12, color: "#3F4B45" }}>
                      • {iss.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 18, marginBottom: 8, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#3F4B45" }}>
                On {selectedRosters.length} roster{selectedRosters.length === 1 ? "" : "s"} across{" "}
                {new Set(selectedRosters.map((r) => r["Event Type"] || "—")).size} categor
                {new Set(selectedRosters.map((r) => r["Event Type"] || "—")).size === 1 ? "y" : "ies"}
              </div>
            </div>
            {selectedRosters.length > 1 && (
              <div style={{ fontSize: 11.5, color: "#9AA59E", marginBottom: 10 }}>
                Matched by name across your uploaded files — if two different people share this
                exact name, they'll show up combined here.
              </div>
            )}
            {Object.entries(
              selectedRosters.reduce((acc, r) => {
                const type = r["Event Type"] || "Other";
                acc[type] = acc[type] || [];
                acc[type].push(r);
                return acc;
              }, {})
            ).map(([type, rows]) => {
              const c = typeColor(type);
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: c.fg }}>
                      {type} ({rows.length})
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {rows.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          background: "#F7F8F5",
                          border: "1px solid #EDF0EC",
                          borderRadius: 8,
                          padding: "8px 10px",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 500, color: "#14261F" }}>{r["Event Name"] || "—"}</div>
                        <div style={{ color: "#6B7A72", marginTop: 2 }}>
                          First visit {formatDate(r["First Visit"]) || "—"} · Leaders @12{" "}
                          {r["Leader at 12"] || "—"} · @144 {r["Leader at 144"] || "—"} · @1728{" "}
                          {r["Leader at 1728"] || "—"}
                        </div>
                        <div style={{ color: "#9AA59E", marginTop: 2, fontFamily: "JetBrains Mono, monospace", fontSize: 10.5 }}>
                          {r.source}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
