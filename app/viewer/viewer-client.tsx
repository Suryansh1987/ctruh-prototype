"use client";

import { useEffect } from "react";

export function ViewerClient({
  glbUrl,
  name,
}: {
  glbUrl: string;
  name: string;
}) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#060d22",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
          }}
        >
          Ctruh 3D Demo
        </span>
        <span
          style={{
            fontSize: 13,
            color: "#fff",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          Drag to rotate · Pinch to zoom · Tap AR to place in your room
        </span>
      </div>

      <model-viewer
        src={glbUrl}
        alt={name}
        camera-controls
        auto-rotate
        ar
        ar-modes="webxr scene-viewer quick-look"
        shadow-intensity="1"
        exposure="1"
        style={{
          flex: 1,
          width: "100%",
          background: "transparent",
        }}
      />
    </div>
  );
}
