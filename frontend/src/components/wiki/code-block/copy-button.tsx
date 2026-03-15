"use client";

import { useState, useCallback } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";

interface CopyButtonProps {
  text: string;
  variant?: "header" | "floating";
}

export function CopyButton({ text, variant = "floating" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing if clipboard API unavailable
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`code-block-copy-btn code-block-copy-btn--${variant}`}
      aria-label={copied ? "Copied" : "Copy code"}
    >
      {copied ? (
        <>
          <CheckIcon className="size-3.5 text-green-500" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <CopyIcon className="size-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
