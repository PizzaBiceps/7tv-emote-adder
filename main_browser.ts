import { emote_adder } from "./main.ts";

if (typeof window !== "undefined") {
  // deno-lint-ignore no-explicit-any
  (window as any).emote_adder = emote_adder;
}
