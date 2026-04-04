"use client";

import type { ComponentPropsWithoutRef } from "react";

export function Response({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={["response", className].filter(Boolean).join(" ")} {...props} />;
}
