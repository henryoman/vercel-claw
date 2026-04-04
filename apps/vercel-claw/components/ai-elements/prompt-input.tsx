"use client";

import type { ComponentPropsWithoutRef } from "react";

type FormProps = ComponentPropsWithoutRef<"form">;
type TextareaProps = ComponentPropsWithoutRef<"textarea">;
type ButtonProps = ComponentPropsWithoutRef<"button">;

export function PromptInput({ className, ...props }: FormProps) {
  return <form className={joinClassNames("prompt-input", className)} {...props} />;
}

export function PromptInputTextarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      rows={1}
      className={joinClassNames("prompt-input-textarea", className)}
      {...props}
    />
  );
}

export function PromptInputSubmit({ className, ...props }: ButtonProps) {
  return (
    <button
      type="submit"
      className={joinClassNames("prompt-input-submit", className)}
      {...props}
    />
  );
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}
