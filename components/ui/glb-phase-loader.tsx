"use client";

import BoxLoader from "@/components/ui/box-loader";

type GlbPhaseLoaderProps = {
  progress: number;
  title?: string;
  subtitle?: string;
};

const PHASES = [
  { threshold: 0, label: "Preparing product assets" },
  { threshold: 25, label: "Reading geometry data" },
  { threshold: 35, label: "Building 3D preview" },
  { threshold: 55, label: "Optimizing textures" },
  { threshold: 75, label: "Finalizing browser preview" },
] as const;

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function getStatusText(progress: number) {
  if (progress >= 100) return "Preview ready";
  if (progress >= 75) return "Finalizing browser preview";
  if (progress >= 55) return "Optimizing textures";
  if (progress >= 35) return "Building 3D preview";
  if (progress >= 25) return "Reading geometry data";
  return "Preparing product assets";
}

function getActivePhaseIndex(progress: number) {
  if (progress >= 100) return PHASES.length - 1;

  for (let index = PHASES.length - 1; index >= 0; index -= 1) {
    if (progress >= PHASES[index].threshold) return index;
  }

  return 0;
}

export function GlbPhaseLoader({
  progress,
  title = "Generating 3D Preview",
  subtitle = "Building your browser-ready 3D product preview.",
}: GlbPhaseLoaderProps) {
  const clamped = clampProgress(progress);
  const activePhase = getActivePhaseIndex(clamped);
  const statusText = getStatusText(clamped);

  return (
    <div className="mx-auto flex w-full max-w-[420px] justify-center">
      <div className="w-full rounded-[24px] bg-white/88 px-5 py-5 shadow-none backdrop-blur-xl sm:px-6 sm:py-6">
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5F86D9]">
            ANALYZING 04 / 04
          </div>
          <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[#081228] sm:text-[28px]">
            {title}
          </h3>
          <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-6 text-[#58709C] sm:text-[14px]">
            {subtitle}
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex h-[116px] w-full items-center justify-center pl-2 sm:pl-1">
            <BoxLoader />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 sm:gap-2">
          {PHASES.map((phase, index) => {
            const isCompleted = clamped >= (PHASES[index + 1]?.threshold ?? 100);
            const isActive = !isCompleted && index === activePhase && clamped < 100;
            const connectorCompleted = clamped >= (PHASES[index + 1]?.threshold ?? 100);
            const connectorActive = isActive && index < PHASES.length - 1;

            return (
              <div key={phase.label} className="flex min-w-0 flex-1 items-center">
                <div
                  className={[
                    "relative h-3.5 w-3.5 shrink-0 rounded-full border transition-all duration-300",
                    isCompleted
                      ? "border-[#0057FF] bg-[#0057FF] shadow-[0_0_0_4px_rgba(0,87,255,0.12)]"
                      : isActive
                        ? "border-[#0057FF] bg-[#6EA0FF] shadow-[0_0_0_6px_rgba(0,87,255,0.12)]"
                        : "border-[#D7E1F3] bg-[#E9EEF7]",
                  ].join(" ")}
                >
                  {isActive ? (
                    <span className="absolute inset-[-4px] animate-ping rounded-full border border-[#7DABFF]/60" />
                  ) : null}
                </div>

                {index < PHASES.length - 1 ? (
                  <div className="relative mx-1.5 h-[2px] flex-1 overflow-hidden rounded-full bg-[#DCE5F5] sm:mx-2">
                    <div
                      className={[
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
                        connectorCompleted || connectorActive ? "right-0 bg-[#0057FF]" : "right-full bg-transparent",
                      ].join(" ")}
                    />
                    {connectorActive ? (
                      <div className="absolute inset-y-0 left-[-30%] w-[32%] animate-[xr-glb-shimmer_1.4s_ease-in-out_infinite] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.85),rgba(255,255,255,0))]" />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center text-[14px] font-medium text-[#0B1A37]">
          {statusText}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#E4EBF8]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0057FF_0%,#4D8DFF_60%,#7DB0FF_100%)] transition-[width] duration-500 ease-out"
              style={{ width: `${clamped}%` }}
            />
          </div>
          <div className="min-w-[40px] text-right text-[13px] font-semibold text-[#0057FF]">
            {clamped}%
          </div>
        </div>

        <style>{`
          @keyframes xr-glb-shimmer {
            0% { transform: translateX(0); opacity: 0; }
            20% { opacity: 0.9; }
            100% { transform: translateX(360%); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
