"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;

export function Conversation({ className, ...props }: DivProps) {
  return <section className={joinClassNames("conversation", className)} {...props} />;
}

export const ConversationContent = forwardRef<HTMLDivElement, DivProps>(
  function ConversationContent({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={joinClassNames("conversation-content", className)}
        {...props}
      />
    );
  },
);

export function ConversationEmptyState({
  className,
  title,
  description,
  children,
  ...props
}: DivProps & {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className={joinClassNames("conversation-empty", className)} {...props}>
      <div>
        <p className="conversation-empty-eyebrow">Ready</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

export function ConversationScrollButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={joinClassNames("conversation-scroll-button", className)}
      {...props}
    />
  );
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}
