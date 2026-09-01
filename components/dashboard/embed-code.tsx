"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function EmbedCode({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fall back to a selection hint.
      const pre = document.getElementById("embed-code");
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }

  return (
    <div className="relative">
      <pre
        id="embed-code"
        className="scroll-thin overflow-x-auto rounded-lg bg-ink-950 p-4 pr-24 font-mono text-xs leading-relaxed text-paper-50/90"
      >
        {snippet}
      </pre>
      <button
        onClick={copy}
        className="absolute right-2.5 top-2.5 inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2.5 text-xs font-medium text-paper-50/80 transition-colors duration-150 hover:bg-white/[0.12] hover:text-paper-50"
        aria-label={copied ? "Copied" : "Copy embed code"}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-relay-400" aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy
          </>
        )}
      </button>
    </div>
  );
}
