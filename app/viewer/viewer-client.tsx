"use client";

import { useEffect, useRef, useState } from "react";

export function ViewerClient({
  glbUrl,
  name,
}: {
  glbUrl: string;
  name: string;
}) {
  const viewerRef = useRef<HTMLElement>(null);
  const [arAvailable, setArAvailable] = useState<boolean | null>(null);
  const [arActive, setArActive] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
    document.head.appendChild(script);

    script.onload = () => {
      const el = viewerRef.current as any;
      if (!el) return;

      const checkAR = () => {
        setArAvailable(!!el.canActivateAR);
      };
      el.addEventListener("load", checkAR);

      el.addEventListener("ar-status", (e: CustomEvent) => {
        setArActive(e.detail.status === "session-started");
      });
    };

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  const handleARClick = () => {
    const el = viewerRef.current as any;
    if (el?.activateAR) el.activateAR();
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#060d22", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{
        padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        zIndex: 10,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
          Ctruh 3D
        </span>
        <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)" }} />
        <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {name}
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}>
          Drag · Pinch to zoom
        </span>
      </div>

      {/* Viewer */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {/* @ts-ignore */}
        <model-viewer
          ref={viewerRef}
          src={glbUrl}
          alt={name}
          camera-controls
          auto-rotate
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="auto"
          ar-placement="floor"
          xr-environment
          shadow-intensity="1"
          shadow-softness="1"
          exposure="1"
          style={{ width: "100%", height: "100%", background: "transparent" }}
        >
          {/* Hide default AR button — we use our own */}
          <button slot="ar-button" style={{ display: "none" }} />
        </model-viewer>

        {/* AR active overlay */}
        {arActive && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            paddingBottom: 40,
          }}>
            <div style={{
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
              borderRadius: 12, padding: "10px 20px",
              color: "#fff", fontSize: 13, letterSpacing: 0.3,
            }}>
              Move your phone to detect a surface, then tap to place
            </div>
          </div>
        )}

        {/* Bottom action area — solid panel, clearly separated from model */}
        {!arActive && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(6,13,34,0.97)",
            backdropFilter: "blur(12px)",
            padding: "20px 20px 40px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>

            {/* AR button */}
            <button
              onClick={handleARClick}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#0057ff",
                border: "none", borderRadius: 16, cursor: "pointer",
                padding: "16px 40px",
                width: "100%", maxWidth: 320,
                justifyContent: "center",
                boxShadow: "0 0 24px rgba(0,87,255,0.3), 0 4px 12px rgba(0,0,0,0.5)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: 0.4 }}>
                View in Your Room
              </span>
            </button>

            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              Available on Android only · iOS support coming soon
            </span>

            {/* Not supported hint */}
            {arAvailable === false && (
              <span style={{ fontSize: 11, color: "rgba(255,100,100,0.7)", textAlign: "center" }}>
                AR not supported on this browser · Try Chrome on Android
              </span>
            )}

            {arAvailable === null && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
                Open on your phone to place this in your room
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
