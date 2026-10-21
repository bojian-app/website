"use client";
import { useEffect } from "react";
export function AppLoginNotice() {
  useEffect(() => {
    if (location.hash || location.search)
      history.replaceState(history.state, "", location.pathname);
  }, []);
  return null;
}
