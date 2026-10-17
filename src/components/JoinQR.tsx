"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function JoinQR({ code }: { code: string }) {
  const [src, setSrc] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const u = `${window.location.origin}/?code=${code}`;
    setUrl(u);
    QRCode.toDataURL(u, { margin: 1, width: 240, color: { dark: "#0A0A0A", light: "#FFFFFF" } })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [code]);

  if (!src) return null;
  return (
    <div className="block-box flex items-center gap-4 bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`QR code to join room ${code}`} width={120} height={120} className="border-[3px] border-ink" />
      <div className="min-w-0">
        <p className="label">SCAN TO JOIN</p>
        <p className="break-all font-mono text-xs">{url}</p>
      </div>
    </div>
  );
}
