import { useEffect, useState } from "react";

export type NetworkQuality = {
  /** true on 2G/slow-2G, or when the user has enabled Data Saver. */
  isSlow: boolean;
  /** true only when the browser explicitly reports Data Saver mode. */
  saveData: boolean;
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  /** Rough downlink estimate in Mbps, when the browser exposes it. */
  downlinkMbps: number | null;
};

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

function readQuality(): NetworkQuality {
  const conn = getConnection();
  const effectiveType = (conn?.effectiveType as NetworkQuality["effectiveType"]) ?? "unknown";
  const saveData = conn?.saveData ?? false;
  const downlinkMbps = typeof conn?.downlink === "number" ? conn.downlink : null;
  const isSlow =
    saveData ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g" ||
    (downlinkMbps !== null && downlinkMbps < 1.5);
  return { isSlow, saveData, effectiveType, downlinkMbps };
}

/**
 * Reads the Network Information API (where supported — mainly Chromium)
 * so images/media can adapt: start with a smaller/lower-quality asset on a
 * slow or metered connection, then upgrade in the background once the
 * device is idle. Browsers without the API (Safari, Firefox) fall back to
 * treating the connection as unknown/fast, which is the safe default.
 */
export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>(() =>
    typeof navigator === "undefined"
      ? { isSlow: false, saveData: false, effectiveType: "unknown", downlinkMbps: null }
      : readQuality(),
  );

  useEffect(() => {
    const conn = getConnection();
    if (!conn?.addEventListener) return;
    const onChange = () => setQuality(readQuality());
    conn.addEventListener("change", onChange);
    return () => conn.removeEventListener?.("change", onChange);
  }, []);

  return quality;
}
