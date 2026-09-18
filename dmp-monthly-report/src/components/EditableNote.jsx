import React, { useEffect, useRef, useState } from "react";

// Editable note panel that persists to localStorage.
// Key is composed as `dmp.note.<scope>` (e.g. "team-Dmplocallatkrabang-A-2026-03").
export default function EditableNote({ storageKey, placeholder, minHeight = 160 }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(true);
  const debounceRef = useRef(null);

  // Load when key changes
  useEffect(() => {
    if (!storageKey) return;
    try {
      const v = localStorage.getItem(storageKey);
      setText(v || "");
      setSaved(true);
    } catch {
      setText("");
    }
  }, [storageKey]);

  const persist = (val) => {
    try {
      if (val) localStorage.setItem(storageKey, val);
      else localStorage.removeItem(storageKey);
      setSaved(true);
    } catch {
      /* ignore quota */
    }
  };

  const onChange = (e) => {
    const v = e.target.value;
    setText(v);
    setSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(v), 400);
  };

  const clear = () => {
    setText("");
    persist("");
  };

  return (
    <div style={{ position: "relative", padding: 4 }}>
      <textarea
        value={text}
        onChange={onChange}
        onBlur={() => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          persist(text);
        }}
        placeholder={placeholder || "พิมพ์ปัญหาและวิธีแก้ที่นี่ — บันทึกอัตโนมัติ"}
        style={{
          width: "100%",
          minHeight,
          padding: "10px 12px",
          fontSize: 13,
          lineHeight: 1.6,
          color: "#1f1f2c",
          border: "1px dashed #d4d4dc",
          borderRadius: 8,
          resize: "vertical",
          fontFamily:
            '"DM Sans", "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif',
          background: text ? "#fff" : "#fafafc",
          outline: "none",
          boxSizing: "border-box",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#A8D75A")}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 11,
          color: "#888",
        }}
      >
        <div>
          {saved ? (
            <span style={{ color: "#27AE60" }}>✓ บันทึกแล้ว</span>
          ) : (
            <span style={{ color: "#F39C12" }}>● กำลังพิมพ์…</span>
          )}
          <span style={{ marginLeft: 10, color: "#aaa" }}>
            {text.length} ตัวอักษร · เก็บในเครื่อง (localStorage)
          </span>
        </div>
        {text && (
          <button
            onClick={clear}
            style={{
              fontSize: 11,
              color: "#9c2a18",
              background: "transparent",
              border: "1px solid #f8b4ad",
              borderRadius: 6,
              padding: "3px 10px",
              cursor: "pointer",
            }}
            title="ลบบันทึก"
          >
            ลบ
          </button>
        )}
      </div>
    </div>
  );
}
