"use client";

import type { ComponentPropsWithoutRef } from "react";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;

export function Message({
  className,
  from,
  ...props
}: DivProps & {
  from: "user" | "assistant" | "system";
}) {
  return (
    <article
      data-from={from}
      className={joinClassNames("message", `message-${from}`, className)}
      {...props}
    />
  );
}

export function MessageAvatar({
  className,
  from,
  ...props
}: DivProps & {
  from: "user" | "assistant" | "system";
}) {
  const label = from === "assistant" ? "AI" : from === "user" ? "You" : "Sys";

  return (
    <div className={joinClassNames("message-avatar", className)} {...props}>
      {label}
    </div>
  );
}

export function MessageContent({ className, ...props }: DivProps) {
  return <div className={joinClassNames("message-content", className)} {...props} />;
}

export function MessageActions({ className, ...props }: DivProps) {
  return <div className={joinClassNames("message-actions", className)} {...props} />;
}

export function MessageAction({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={joinClassNames("message-action", className)}
      {...props}
    />
  );
}

export function MessageResponse({ className, ...props }: DivProps) {
  return <div className={joinClassNames("message-response", className)} {...props} />;
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}
