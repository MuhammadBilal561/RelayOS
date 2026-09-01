"use client";

import { useEffect, useState } from "react";
import { ChatWidget } from "./chat-widget";

interface WidgetFrameProps {
  widgetKey: string;
  businessName: string;
  brandColor: string;
}

/**
 * Renders the chat widget either full-bleed inside the embed iframe, or
 * centered in a phone-like frame when the page is opened directly (the
 * live-demo / preview experience).
 */
export function WidgetFrame({ widgetKey, businessName, brandColor }: WidgetFrameProps) {
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
  }, []);

  if (inIframe) {
    return (
      <div className="h-screen w-screen bg-transparent p-2">
        <ChatWidget widgetKey={widgetKey} businessName={businessName} brandColor={brandColor} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper-50 px-4 py-10">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400">
        RelayOS · live widget preview
      </p>
      <div className="h-[560px] w-full max-w-[380px] animate-scale-in">
        <ChatWidget widgetKey={widgetKey} businessName={businessName} brandColor={brandColor} />
      </div>
      <p className="mt-4 max-w-sm text-center text-xs leading-relaxed text-ink-400">
        This is exactly what your visitors see when the embed script is installed on your site.
      </p>
    </div>
  );
}
