import { tell } from "./ui";

const KEY = "nsg.tutorial";

export type TutorialState = "done" | "skipped";

export function tutorialState(): TutorialState | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "done" || v === "skipped" ? v : null;
  } catch {
    return null;
  }
}

export function markTutorial(state: TutorialState) {
  try {
    if (tutorialState() !== "done") localStorage.setItem(KEY, state);
  } catch {}
}

export function skipTutorial() {
  markTutorial("skipped");
  void tell("Tutorial skipped", "You can find it anytime under How to play on the home screen.");
}
