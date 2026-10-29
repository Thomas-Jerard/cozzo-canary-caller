import type { JSX } from "react";
export type CanaryPose = "idle" | "wave" | "point" | "think" | "sign" | "calc" | "sleep" | "peek" | "cheer" | "search";
export default function Canary(props: {
  pose?: CanaryPose;
  size?: number;
  className?: string;
  title?: string;
  sign?: string;
  daynight?: boolean;
  eyes?: string;
}): JSX.Element;
