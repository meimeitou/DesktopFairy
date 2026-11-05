import * as React from "react";

// Vendored @cherrystudio/ui's rolldown runtime calls createRequire() while
// evaluating, then uses it only to load the CJS react-error-boundary build.
export function createRequire() {
  return function require(id: string) {
    if (id === "react") return React;
    throw new Error(`Renderer cannot require("${id}")`);
  };
}
