import type React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean | string;
        "auto-rotate"?: boolean | string;
        ar?: boolean | string;
        "ar-modes"?: string;
        "ar-scale"?: string;
        "ar-placement"?: string;
        "xr-environment"?: boolean | string;
        "shadow-intensity"?: string;
        "shadow-softness"?: string;
        exposure?: string;
        "environment-image"?: string;
        style?: React.CSSProperties;
        onArStatus?: (e: Event) => void;
      };
    }
  }
}
