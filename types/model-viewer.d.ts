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
        "shadow-intensity"?: string;
        exposure?: string;
        style?: React.CSSProperties;
      };
    }
  }
}
