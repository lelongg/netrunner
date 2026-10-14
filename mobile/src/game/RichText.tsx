import { type ComponentChildren, h } from "preact";
import { iconize } from "./text";

const ALLOWED = new Set(["strong", "em", "ul", "li"]);

interface Node {
  tag: string;
  children: ComponentChildren[];
}

export function RichText({ text, class: className }: { text: string; class?: string }) {
  const root: Node = { tag: "div", children: [] };
  const stack: Node[] = [root];
  for (const part of text.split(/(<\/?[a-z]+>)/i)) {
    const tag = part.match(/^<(\/?)([a-z]+)>$/i);
    const top = stack[stack.length - 1];
    if (tag && ALLOWED.has(tag[2].toLowerCase())) {
      const name = tag[2].toLowerCase();
      if (!tag[1]) {
        stack.push({ tag: name, children: [] });
      } else if (stack.length > 1 && top.tag === name) {
        stack.pop();
        stack[stack.length - 1].children.push(h(name, null, ...top.children));
      }
    } else if (part && !(top.tag === "ul" && !part.trim())) {
      top.children.push(iconize(part));
    }
  }
  while (stack.length > 1) {
    const node = stack.pop()!;
    stack[stack.length - 1].children.push(h(node.tag, null, ...node.children));
  }
  return h("div", { class: className }, ...root.children);
}
