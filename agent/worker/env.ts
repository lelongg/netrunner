const g = globalThis as any;
g.window ??= g;
g.addEventListener ??= () => {};
g.removeEventListener ??= () => {};
g.document ??= { visibilityState: "visible", addEventListener() {}, removeEventListener() {}, baseURI: "https://lelongg.github.io/netrunner/" };
g.location ??= new URL("https://lelongg.github.io/netrunner/");
