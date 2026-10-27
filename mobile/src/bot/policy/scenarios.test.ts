import { describe, expect, it } from "vitest";
import { Scenario } from "./scenario.ts";

const best = (s: Scenario, side: "corp" | "runner", pred: (why: string) => boolean) => Math.max(-1000, ...s.considered(side).filter((p) => pred(p.why)).map((p) => p.score));

function centrals(s: Scenario) {
  s.clearHand("corp");
  s.summon("corp", "Tithe", "Whitespace");
  s.credits("corp", 40);
  s.install("corp", "Tithe", "HQ");
  s.install("corp", "Whitespace", "R&D");
  s.rez("Tithe");
  s.rez("Whitespace");
  s.clicks("corp", 3);
}

function remoteWithAgenda(s: Scenario, agenda: string, rezAll: boolean) {
  centrals(s);
  s.summon("corp", "Ansel 1.0", "Pharos", agenda);
  s.install("corp", "Ansel 1.0", "New remote");
  s.install("corp", "Pharos", "Server 1");
  s.install("corp", agenda, "Server 1");
  if (rezAll) s.rez("Ansel 1.0");
  s.rez("Pharos");
}

describe("corp keeps credits to rez the ice in front of its agenda", () => {
  it("clicks for credits instead of advancing when Ansel is unrezzed and six credits are needed", () => {
    const s = new Scenario("core-hb", "core-criminal");
    remoteWithAgenda(s, "Offworld Office", false);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Marjanah", "Leech");
    s.credits("runner", 12);
    s.install("runner", "Marjanah");
    s.install("runner", "Leech");
    s.credits("runner", 7);
    s.endTurn("runner");
    s.clearHand("corp");
    s.credits("corp", 5);
    const move = s.decide("corp");
    expect(move?.command).toBe("credit");
    expect(s.last("corp").chosen?.why).toContain("needed to rez");
    expect(best(s, "corp", (w) => w.startsWith("advance Offworld"))).toBeLessThan(30);
  });

  it("advances when the ice in front is already rezzed", () => {
    const s = new Scenario("core-hb", "core-criminal");
    remoteWithAgenda(s, "Offworld Office", true);
    s.endTurn("corp");
    s.endTurn("runner");
    s.clearHand("corp");
    s.credits("corp", 5);
    expect(s.decide("corp")?.command).toBe("advance");
  });
});

describe("never advance counts the Seamless Launch click", () => {
  it("advances a five-advancement agenda on its install turn even with Seamless Launch in hand", () => {
    const s = new Scenario("core-hb", "core-criminal");
    centrals(s);
    s.summon("corp", "Ansel 1.0", "Pharos");
    s.install("corp", "Ansel 1.0", "New remote");
    s.install("corp", "Pharos", "Server 1");
    s.rez("Ansel 1.0");
    s.rez("Pharos");
    s.endTurn("corp");
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Send a Message", "Seamless Launch");
    s.credits("corp", 20);
    s.install("corp", "Send a Message", "Server 1");
    expect(s.decide("corp")?.command).toBe("advance");
  });

  it("does not advance a three-advancement agenda on its install turn", () => {
    const s = new Scenario("core-hb", "core-criminal");
    centrals(s);
    s.summon("corp", "Ansel 1.0", "Pharos");
    s.install("corp", "Ansel 1.0", "New remote");
    s.install("corp", "Pharos", "Server 1");
    s.rez("Ansel 1.0");
    s.rez("Pharos");
    s.endTurn("corp");
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Luminal Transubstantiation", "Hedge Fund");
    s.credits("corp", 20);
    s.install("corp", "Luminal Transubstantiation", "Server 1");
    expect(s.decide("corp")?.command).not.toBe("advance");
    expect(best(s, "corp", (w) => w.startsWith("advance Luminal"))).toBeLessThanOrEqual(22);
  });
});

describe("corp rezzes only ice that bites", () => {
  function hqWhitespace(runnerCredits: number) {
    const s = new Scenario("core-hb", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Whitespace");
    s.credits("corp", 20);
    s.install("corp", "Whitespace", "HQ");
    s.credits("corp", 6);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Tread Lightly");
    s.credits("runner", runnerCredits + 1);
    s.act("runner", "Tread Lightly: Play");
    s.act("runner", "Choose: HQ");
    for (let i = 0; i < 6 && s.view("corp").run?.phase !== "approach-ice"; i++) {
      if (s.actions("runner").some((x) => x.command === "continue")) s.runStep("runner");
      else s.pass("corp");
    }
    return s;
  }

  it("keeps its credits against a Runner Whitespace cannot stop", () => {
    const s = hqWhitespace(11);
    expect(s.decide("corp")?.command).not.toBe("rez");
  });

  it("rezzes Whitespace against a Runner it ends the run on", () => {
    const s = hqWhitespace(5);
    expect(s.decide("corp")?.command).toBe("rez");
  });
});

describe("corp does not stack ice it cannot rez", () => {
  it("holds a third expensive ice when two unrezzed ones already exceed its credits", () => {
    const s = new Scenario("core-hb", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Ansel 1.0", "Pharos", "Brân 1.0", "Hedge Fund");
    s.credits("corp", 40);
    s.install("corp", "Ansel 1.0", "HQ");
    s.install("corp", "Pharos", "R&D");
    s.clicks("corp", 3);
    s.credits("corp", 6);
    s.decide("corp");
    expect(best(s, "corp", (w) => w.startsWith("install Brân"))).toBeLessThanOrEqual(22);
    expect(s.last("corp").chosen?.kind).not.toBe("install-ice");
  });
});

describe("corp keeps a rez cushion against Tread Lightly", () => {
  function remoteShell(credits: number) {
    const s = new Scenario("core-hb", "core-criminal");
    centrals(s);
    s.summon("corp", "Ansel 1.0", "Pharos", "Offworld Office");
    s.install("corp", "Ansel 1.0", "New remote");
    s.install("corp", "Pharos", "Server 1");
    s.clicks("corp", 2);
    s.credits("corp", credits);
    s.decide("corp");
    return best(s, "corp", (w) => w.includes("Offworld Office") && w.includes("Server 1"));
  }

  it("will not put an agenda behind unrezzed enders it cannot rez under Tread Lightly", () => {
    expect(remoteShell(7)).toBeLessThanOrEqual(15);
  });

  it("installs once one ender can be rezzed with the cushion", () => {
    expect(remoteShell(12)).toBeGreaterThan(30);
  });
});

describe("runner prices Whitespace with real credits, not Overclock's", () => {
  function overclockHq(credits: number) {
    const s = new Scenario("core-hb", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Whitespace");
    s.credits("corp", 20);
    s.install("corp", "Whitespace", "HQ");
    s.rez("Whitespace");
    s.summon("corp", "Hedge Fund", "Offworld Office", "Send a Message");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Overclock", "Sure Gamble", "Jailbreak", "Jailbreak", "Tread Lightly");
    s.credits("runner", credits);
    s.decide("runner");
    return best(s, "runner", (w) => w.startsWith("Overclock into HQ"));
  }

  it("does not plan Overclock into HQ with three credits", () => {
    expect(overclockHq(3)).toBeLessThan(0);
  });

  it("plans it with ten credits", () => {
    expect(overclockHq(10)).toBeGreaterThan(30);
  });
});

describe("corp takes an early window", () => {
  it("installs an agenda behind rezzed ice the Runner cannot break", () => {
    const s = new Scenario("core-hb", "core-criminal");
    centrals(s);
    s.summon("corp", "Palisade", "Luminal Transubstantiation");
    s.install("corp", "Palisade", "New remote");
    s.rez("Palisade");
    s.clicks("corp", 2);
    s.credits("corp", 10);
    const move = s.decide("corp");
    expect(s.last("corp").chosen?.kind).toBe("install-agenda");
    expect(move?.command).toBe("play");
  });

  it("scores an agenda that can be finished this turn", () => {
    const s = new Scenario("core-hb", "core-criminal");
    remoteWithAgenda(s, "Luminal Transubstantiation", true);
    s.endTurn("corp");
    s.endTurn("runner");
    s.clearHand("corp");
    s.credits("corp", 10);
    for (let i = 0; i < 3; i++) {
      const move = s.decide("corp");
      expect(move?.command).toBe("advance");
      s.act("corp", "Luminal Transubstantiation: Advance");
    }
    expect(s.decide("corp")?.command).toBe("score");
  });
});

describe("corp protects its agendas in hand", () => {
  it("never discards an agenda at end of turn while other cards remain", () => {
    const s = new Scenario("core-hb", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Send a Message", "Offworld Office", "Hedge Fund", "Tithe", "Whitespace", "Palisade", "Nico Campaign");
    s.clicks("corp", 0);
    s.act("corp", "End turn");
    const move = s.decide("corp");
    expect(move?.command).toBe("select");
    const picked = s.last("corp").chosen?.why ?? "";
    expect(picked).not.toMatch(/Send a Message|Offworld Office/);
  });

  it("gives Hansei Review a card that is not an agenda", () => {
    const s = new Scenario("core-nbn", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Hansei Review", "Send a Message", "Orbital Superiority", "Ping");
    s.credits("corp", 10);
    s.act("corp", "Hansei Review: Play");
    const move = s.decide("corp");
    expect(move?.command).toBe("select");
    expect(s.last("corp").chosen?.why ?? "").not.toMatch(/Send a Message|Orbital Superiority/);
  });
});

describe("runner reads the corp's purse", () => {
  it("runs a remote under Tread Lightly when the Corp cannot rez its ice", () => {
    const s = new Scenario("core-hb", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Tithe", "Whitespace", "Ansel 1.0", "Pharos", "Offworld Office");
    s.credits("corp", 40);
    s.install("corp", "Tithe", "HQ");
    s.install("corp", "Whitespace", "R&D");
    s.clicks("corp", 3);
    s.install("corp", "Ansel 1.0", "New remote");
    s.install("corp", "Pharos", "Server 1");
    s.install("corp", "Offworld Office", "Server 1");
    s.credits("corp", 3);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Tread Lightly", "Sure Gamble", "Jailbreak", "Jailbreak", "Overclock");
    s.credits("runner", 6);
    s.decide("runner");
    expect(best(s, "runner", (w) => w.startsWith("Tread Lightly into Server 1"))).toBeGreaterThan(50);
  });

  it("does not run into unrezzed ice with an empty grip", () => {
    const s = new Scenario("core-hb", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Tithe", "Offworld Office");
    s.credits("corp", 40);
    s.install("corp", "Tithe", "New remote");
    s.install("corp", "Offworld Office", "Server 1");
    s.credits("corp", 10);
    s.endTurn("corp");
    s.clearHand("runner");
    s.credits("runner", 8);
    s.decide("runner");
    expect(best(s, "runner", (w) => w.startsWith("run Server 1"))).toBeLessThan(30);
  });
});

function settleRun(s: Scenario, side: "corp" | "runner") {
  for (let i = 0; i < 30 && s.view(side).run; i++) {
    const mine = s.actions(side);
    const yes = mine.find((x) => x.label === "Choose: Yes" || x.label === "Choose: No action");
    if (yes) {
      s.act(side, yes.label);
      continue;
    }
    if (mine.some((x) => x.command === "continue" || x.command === "start-next-phase")) s.runStep(side);
    else if (s.actions(side === "corp" ? "runner" : "corp").some((x) => x.command === "continue")) s.pass(side === "corp" ? "runner" : "corp");
    else break;
  }
  for (let i = 0; i < 4; i++) {
    const yes = s.actions(side).find((x) => x.label === "Choose: Yes");
    if (!yes) break;
    s.act(side, "Choose: Yes");
  }
}

describe("corp answers a virus dig", () => {
  function conduitDig(credits: number) {
    const s = new Scenario("core-hb", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Tithe", "Whitespace", "Palisade");
    s.credits("corp", 40);
    s.install("corp", "Tithe", "HQ");
    s.rez("Tithe");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Conduit");
    s.credits("runner", 10);
    s.install("runner", "Conduit");
    for (let i = 0; i < 3; i++) {
      s.act("runner", "Conduit: [Click]");
      settleRun(s, "runner");
    }
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Palisade", "Hedge Fund");
    s.credits("corp", credits);
    return s;
  }

  it("purges or ices R&D rather than clicking for credits when Conduit holds three counters", () => {
    const s = conduitDig(4);
    const conduit = s.view("corp").runner.rig.program.find((c: any) => c.title === "Conduit");
    expect(Number(conduit?.counter?.virus ?? 0)).toBeGreaterThanOrEqual(3);
    const move = s.decide("corp");
    expect(["purge", "play"]).toContain(move?.command);
    expect(s.last("corp").chosen?.why).toMatch(/purge|R&D/);
  });
});

describe("corp hides an agenda flood with Sprint", () => {
  it("plays Sprint with four agendas and no ice, and shuffles agendas back", () => {
    const s = new Scenario("core-hb", "core-criminal");
    centrals(s);
    s.summon("corp", "Send a Message", "Offworld Office", "Offworld Office", "Luminal Transubstantiation", "Sprint");
    s.credits("corp", 20);
    s.decide("corp");
    expect(best(s, "corp", (w) => w.startsWith("Sprint: three cards, and two of"))).toBeGreaterThan(40);
    s.act("corp", "Sprint: Play");
    for (let i = 0; i < 2; i++) {
      const pick = s.decide("corp");
      expect(pick?.command).toBe("select");
      expect(s.last("corp").chosen?.why).toMatch(/goes back into R&D/);
      s.act("corp", "Select " + (s.last("corp").chosen?.why.match(/Sprint: (.+) goes back/)?.[1] ?? ""));
    }
  });
});

describe("corp does not purge for a shallow dig", () => {
  it("ices R&D instead of purging when Conduit holds two counters", () => {
    const s = new Scenario("core-hb", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Tithe");
    s.credits("corp", 40);
    s.install("corp", "Tithe", "HQ");
    s.rez("Tithe");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Conduit");
    s.credits("runner", 10);
    s.install("runner", "Conduit");
    for (let i = 0; i < 2; i++) {
      s.act("runner", "Conduit: [Click]");
      settleRun(s, "runner");
    }
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Palisade");
    s.credits("corp", 6);
    const move = s.decide("corp");
    expect(move?.command).not.toBe("purge");
    expect(best(s, "corp", (w) => w.startsWith("purge"))).toBeLessThan(0);
    expect(s.last("corp").chosen?.why).toMatch(/R&D/);
  });
});

function weylandBoard(s: Scenario) {
  s.clearHand("corp");
  s.summon("corp", "Palisade", "Funhouse", "Whitespace", "Pharos", "Tithe", "Whitespace", "Tithe");
  const places: [string, string][] = [["Palisade", "HQ"], ["Funhouse", "HQ"], ["Whitespace", "R&D"], ["Pharos", "New remote"], ["Tithe", "Server 1"], ["Whitespace", "Server 1"], ["Tithe", "Server 1"]];
  for (const [ice, server] of places) {
    s.clicks("corp", 3);
    s.credits("corp", 40);
    s.install("corp", ice, server);
  }
  s.endTurn("corp");
}

describe("corp ices a dug R&D even with unrezzed ice elsewhere", () => {
  it("installs Pharos on R&D after two Conduit runs although the remote's ice is not paid for", () => {
    const s = new Scenario("core-weyland", "core-criminal");
    weylandBoard(s);
    s.clearHand("runner");
    s.summon("runner", "Conduit", "Buzzsaw");
    s.credits("runner", 20);
    s.install("runner", "Conduit");
    s.install("runner", "Buzzsaw");
    s.summon("runner", "Sure Gamble", "Sure Gamble", "Jailbreak");
    for (let i = 0; i < 2; i++) {
      s.act("runner", "Conduit: [Click]");
      settleRun(s, "runner");
    }
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Pharos", "Orbital Superiority");
    s.credits("corp", 14);
    const move = s.decide("corp");
    expect(move?.command).toBe("play");
    expect(s.last("corp").chosen?.why).toMatch(/Pharos on R&D/);
  });
});

describe("corp jams agendas when the hand is flooded", () => {
  it("installs an agenda behind four ice instead of clicking for credits with four agendas in hand", () => {
    const s = new Scenario("core-weyland", "core-criminal");
    weylandBoard(s);
    s.clearHand("runner");
    s.summon("runner", "Buzzsaw", "Cleaver", "Carnivore");
    s.credits("runner", 30);
    s.install("runner", "Buzzsaw");
    s.install("runner", "Cleaver");
    s.install("runner", "Carnivore");
    s.summon("runner", "Sure Gamble", "Sure Gamble", "Jailbreak", "Dirty Laundry");
    s.credits("runner", 20);
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Send a Message", "Orbital Superiority", "Offworld Office", "Orbital Superiority", "Public Trail");
    s.credits("corp", 15);
    const move = s.decide("corp");
    expect(move?.command).toBe("play");
    expect(s.last("corp").chosen?.why).toMatch(/install (Offworld Office|Orbital Superiority) behind 4 ice in Server 1 .*jamming/);
  });
});

describe("corp does not pay to rez ice the Runner breaks anyway", () => {
  function overclockRun(runnerCredits: number, overclock: boolean) {
    const s = new Scenario("core-weyland", "core-anarch");
    s.clearHand("corp");
    s.summon("corp", "Palisade", "Pharos", "Pharos", "Offworld Office");
    for (const [card, server] of [["Palisade", "New remote"], ["Pharos", "Server 1"], ["Pharos", "Server 1"], ["Offworld Office", "Server 1"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.credits("corp", 40);
      s.install("corp", card, server);
    }
    s.rez("Palisade");
    s.credits("corp", 9);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Cleaver", "Overclock", "Sure Gamble", "Sure Gamble");
    s.credits("runner", 20);
    s.install("runner", "Cleaver");
    s.credits("runner", runnerCredits);
    if (overclock) {
      s.act("runner", "Overclock: Play");
      s.act("runner", "Choose: Server 1");
    } else s.act("runner", "Run on Server 1");
    for (let i = 0; i < 12; i++) {
      if (s.actions("corp").some((x) => x.command === "rez")) break;
      if (s.actions("runner").some((x) => x.command === "continue" || x.command === "start-next-phase")) s.runStep("runner");
      else if (s.actions("corp").some((x) => x.command === "continue")) s.pass("corp");
      else break;
    }
    expect(s.actions("corp").some((x) => x.command === "rez")).toBe(true);
    return s;
  }

  it("keeps its credits when Overclock pays for the whole run", () => {
    const s = overclockRun(12, true);
    const move = s.decide("corp");
    expect(move?.command).not.toBe("rez");
    expect(s.last("corp").chosen?.why).toContain("gets through Server 1 anyway");
  });

  it("rezzes the outer Pharos when the Runner cannot afford both", () => {
    const s = overclockRun(7, false);
    expect(s.decide("corp")?.command).toBe("rez");
  });
});

describe("weyland advances ice at most once per turn", () => {
  it("does not advance a second piece of ice after Built to Last paid once", () => {
    const s = new Scenario("core-weyland", "core-anarch");
    s.clearHand("corp");
    s.summon("corp", "Pharos", "Pharos");
    s.credits("corp", 40);
    s.install("corp", "Pharos", "HQ");
    s.install("corp", "Pharos", "R&D");
    s.rez("Pharos");
    s.rez("Pharos");
    s.endTurn("corp");
    s.endTurn("runner");
    s.clearHand("corp");
    s.credits("corp", 6);
    const first = s.decide("corp");
    expect(first?.command).toBe("advance");
    s.play("corp", first!);
    const second = s.decide("corp");
    expect(second?.command).not.toBe("advance");
  });
});

describe("corp economy before thin installs", () => {
  it("clicks for the credits that make Government Subsidy playable rather than installing behind one ice", () => {
    const s = new Scenario("core-weyland", "core-shaper");
    s.clearHand("corp");
    s.summon("corp", "Palisade", "Palisade", "Palisade");
    s.credits("corp", 10);
    s.install("corp", "Palisade", "New remote");
    s.install("corp", "Palisade", "HQ");
    s.install("corp", "Palisade", "R&D");
    s.rez("Palisade");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Echelon", "Unity", "Smartware Distributor", "Sure Gamble", "Sure Gamble");
    s.credits("runner", 12);
    s.install("runner", "Echelon");
    s.install("runner", "Unity");
    s.install("runner", "Smartware Distributor");
    s.credits("runner", 3);
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Offworld Office", "Government Subsidy", "Retribution");
    s.credits("corp", 7);
    const move = s.decide("corp");
    expect(move?.command).toBe("credit");
    expect(s.last("corp").chosen?.why).toContain("playable this turn");
    expect(best(s, "corp", (w) => w.startsWith("install Offworld Office"))).toBeLessThan(40);
  });
});

describe("corp does not purge when it cannot rez the ice it has", () => {
  it("takes credits instead of purging three Conduit counters at three credits", () => {
    const s = new Scenario("core-weyland", "core-shaper");
    s.clearHand("corp");
    s.summon("corp", "Palisade", "Funhouse");
    s.credits("corp", 10);
    s.install("corp", "Palisade", "R&D");
    s.clicks("corp", 3);
    s.install("corp", "Funhouse", "R&D");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Conduit", "Cleaver", "Unity", "Sure Gamble", "Sure Gamble");
    s.credits("runner", 20);
    s.install("runner", "Conduit");
    s.install("runner", "Cleaver");
    s.install("runner", "Unity");
    for (let i = 0; i < 3; i++) {
      s.clicks("runner", 3);
      s.act("runner", "Conduit: [Click]");
      settleRun(s, "runner");
    }
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Retribution");
    s.credits("corp", 3);
    const move = s.decide("corp");
    expect(move?.command).not.toBe("purge");
  });
});

describe("jinteki plays its threats (replay 2L7UEEVY)", () => {
  it("rezzes an advanced Clearinghouse so that it can fire, and fires it against a thin grip", () => {
    const s = new Scenario("core-jinteki", "core-shaper");
    s.clearHand("corp");
    s.summon("corp", "Clearinghouse");
    s.credits("corp", 10);
    s.install("corp", "Clearinghouse", "New remote");
    const card = () => s.view("corp").corp.servers.remote1.content[0];
    for (let i = 0; i < 3; i++) {
      s.clicks("corp", 3);
      s.act("corp", "Clearinghouse: Advance");
    }
    expect(Number(card()["advance-counter"])).toBe(3);
    s.clicks("corp", 0);
    s.clearHand("runner");
    s.summon("runner", "Sure Gamble", "Sure Gamble", "Sure Gamble");
    const move = s.decide("corp");
    expect(move?.command).toBe("rez");
    expect(s.last("corp").chosen?.why).toMatch(/rez Clearinghouse/);
    s.play("corp", move!);
    expect(card().rezzed).toBeTruthy();
    s.act("corp", "End turn");
    s.act("runner", "Start turn");
    s.clearHand("runner");
    s.summon("runner", "Sure Gamble", "Sure Gamble");
    s.clicks("runner", 0);
    s.act("runner", "End turn");
    s.act("corp", "Start turn");
    let answer = s.decide("corp");
    for (let i = 0; i < 5 && answer && answer.command !== "choice"; i++) {
      s.play("corp", answer);
      answer = s.decide("corp");
    }
    expect(answer?.command).toBe("choice");
    expect(s.last("corp").chosen?.why).toMatch(/3 meat damage against a grip of 2/);
  });

  it("does not play Hansei Review when every other card in hand is an agenda", () => {
    const s = new Scenario("core-jinteki", "core-shaper");
    s.clearHand("corp");
    s.summon("corp", "Hansei Review", "Orbital Superiority", "Send a Message");
    s.credits("corp", 12);
    s.decide("corp");
    expect(best(s, "corp", (w) => w.startsWith("play Hansei Review"))).toBeLessThan(20);
  });

  it("does not rez Karunā for a kill the Runner can break with Echelon", () => {
    const s = new Scenario("core-jinteki", "core-shaper");
    s.clearHand("corp");
    s.summon("corp", "Karunā", "Send a Message");
    s.credits("corp", 10);
    s.install("corp", "Karunā", "HQ");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Echelon", "Unity", "Cleaver", "Tread Lightly", "Sure Gamble", "Sure Gamble");
    s.credits("runner", 20);
    s.install("runner", "Echelon");
    s.install("runner", "Unity");
    s.install("runner", "Cleaver");
    s.credits("runner", 4);
    s.act("runner", "Tread Lightly: Play");
    s.act("runner", "Choose: HQ");
    for (let i = 0; i < 8; i++) {
      if (s.actions("corp").some((x) => x.command === "rez")) break;
      if (s.actions("runner").some((x) => x.command === "continue" || x.command === "start-next-phase")) s.runStep("runner");
      else if (s.actions("corp").some((x) => x.command === "continue")) s.pass("corp");
      else break;
    }
    expect(s.actions("corp").some((x) => x.command === "rez")).toBe(true);
    s.credits("corp", 7);
    const move = s.decide("corp");
    expect(s.last("corp").chosen?.why ?? "").not.toMatch(/net damage against/);
    expect(move?.command).not.toBe("rez");
  });

  it("installs an agenda behind a rezzed Palisade when the Runner has no fracter and no credits", () => {
    const s = new Scenario("core-jinteki", "core-shaper");
    s.clearHand("corp");
    s.summon("corp", "Palisade", "Diviner", "Karunā");
    s.credits("corp", 40);
    s.install("corp", "Diviner", "R&D");
    s.rez("Diviner");
    s.install("corp", "Karunā", "HQ");
    s.rez("Karunā");
    s.clicks("corp", 3);
    s.install("corp", "Palisade", "New remote");
    s.rez("Palisade");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Unity", "Echelon", "Sure Gamble", "Sure Gamble", "Sure Gamble", "Sure Gamble", "Sure Gamble");
    s.credits("runner", 10);
    s.install("runner", "Unity");
    s.install("runner", "Echelon");
    s.credits("runner", 2);
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Diviner", "Offworld Office", "Spin Doctor");
    s.credits("corp", 18);
    const chosen: string[] = [];
    for (let i = 0; i < 6 && Number(s.view("corp").corp.click) > 0; i++) {
      const move = s.decide("corp");
      if (!move) break;
      chosen.push(`${move.command}: ${s.last("corp").chosen?.why ?? ""}`);
      s.play("corp", move);
    }
    expect(chosen.join(" | ")).toMatch(/Offworld Office in Server 1|install Offworld Office/);
    expect(s.server("Server 1")?.content.some((c: any) => c.title === "Offworld Office")).toBe(true);
  });
});

describe("nbn keeps its last credits (replay BNDST9RP)", () => {
  function brokeCorp() {
    const s = new Scenario("core-nbn", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Palisade", "Funhouse", "Tithe", "Manegarm Skunkworks");
    s.credits("corp", 40);
    for (const [card, server] of [["Funhouse", "HQ"], ["Palisade", "New remote"], ["Manegarm Skunkworks", "Server 1"], ["Tithe", "New remote"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.install("corp", card, server);
    }
    s.rez("Funhouse");
    s.rez("Palisade");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Buzzsaw", "Smartware Distributor", "Smartware Distributor", "Pennyshaver", "Sure Gamble", "Sure Gamble");
    s.credits("runner", 20);
    s.install("runner", "Buzzsaw");
    s.install("runner", "Smartware Distributor");
    s.install("runner", "Smartware Distributor");
    s.clicks("runner", 3);
    s.install("runner", "Pennyshaver");
    s.credits("runner", 5);
    s.say("runner", "/tag 1");
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Send a Message", "Palisade", "Ping", "Tithe");
    return s;
  }

  it("does not spend its last credits trashing resources with an agenda to score", () => {
    const s = brokeCorp();
    s.credits("corp", 4);
    const move = s.decide("corp");
    expect(move?.command).not.toBe("trash-resource");
    expect(best(s, "corp", (w) => w.startsWith("trash a resource"))).toBeLessThan(0);
  });

  it("does not install a five-advancement agenda behind one ice with three credits", () => {
    const s = brokeCorp();
    s.credits("corp", 3);
    s.decide("corp");
    expect(best(s, "corp", (w) => /Send a Message/.test(w) && /install|Server 1/.test(w))).toBeLessThan(25);
  });
});

describe("the action list respects the turn structure (replay 82YJDZAE)", () => {
  it("offers no click action during the Corp's start-of-turn window, only rez and the mandatory draw", () => {
    const s = new Scenario("core-jinteki", "core-anarch");
    s.clearHand("corp");
    s.summon("corp", "Clearinghouse", "Palisade");
    s.credits("corp", 10);
    s.install("corp", "Clearinghouse", "New remote");
    s.clicks("corp", 3);
    s.act("corp", "Clearinghouse: Advance");
    s.clicks("corp", 0);
    s.act("corp", "End turn");
    s.act("runner", "Start turn");
    s.clicks("runner", 0);
    s.act("runner", "End turn");
    s.act("corp", "Start turn");
    const labels = s.actions("corp").map((a) => a.label);
    expect(labels.some((l) => l.startsWith("Mandatory draw"))).toBe(true);
    expect(labels.some((l) => l.includes("Rez"))).toBe(true);
    expect(labels.some((l) => /Advance|Install|Gain 1|Draw$/.test(l))).toBe(false);
    s.act("corp", "Mandatory draw");
    expect(s.actions("corp").some((a) => a.label.includes("Advance"))).toBe(true);
  });
});

describe("runner respects its grip and its hand (replay 82YJDZAE)", () => {
  it("does not run a two-ice Jinteki remote with no breakers and a grip of five", () => {
    const s = new Scenario("core-jinteki", "core-anarch");
    s.clearHand("corp");
    s.summon("corp", "Tithe", "Whitespace", "Karunā", "Tithe", "Offworld Office");
    s.credits("corp", 40);
    for (const [c, srv] of [["Tithe", "HQ"], ["Whitespace", "R&D"], ["Karunā", "New remote"], ["Tithe", "Server 1"], ["Offworld Office", "Server 1"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.install("corp", c, srv);
    }
    s.clicks("corp", 3);
    s.act("corp", "Offworld Office: Advance");
    s.act("corp", "Offworld Office: Advance");
    s.credits("corp", 7);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Smartware Distributor", "Smartware Distributor", "DZMZ Optimizer");
    s.credits("runner", 20);
    s.install("runner", "Smartware Distributor");
    s.install("runner", "Smartware Distributor");
    s.install("runner", "DZMZ Optimizer");
    s.clicks("runner", 4);
    s.summon("runner", "Overclock", "Botulus", "Verbal Plasticity", "Wildcat Strike", "Sure Gamble");
    s.credits("runner", 9);
    s.decide("runner");
    expect(best(s, "runner", (w) => w.startsWith("run Server 1"))).toBeLessThan(20);
  });

  it("installs its hand instead of drawing on a full grip when rich", () => {
    const s = new Scenario("core-jinteki", "core-anarch");
    s.clearHand("corp");
    s.summon("corp", "Tithe", "Palisade", "Whitespace", "Karunā", "Tithe", "Diviner", "Urtica Cipher");
    s.credits("corp", 40);
    for (const [c, srv] of [["Tithe", "HQ"], ["Palisade", "HQ"], ["Whitespace", "R&D"], ["Karunā", "New remote"], ["Tithe", "Server 1"], ["Diviner", "Server 1"], ["Urtica Cipher", "Server 1"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.credits("corp", 40);
      s.install("corp", c, srv);
    }
    s.rez("Karunā");
    s.credits("corp", 9);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Smartware Distributor", "Smartware Distributor", "DZMZ Optimizer", "Buzzsaw", "Leech", "Cookbook");
    s.credits("runner", 30);
    for (const c of ["Smartware Distributor", "Smartware Distributor", "DZMZ Optimizer", "Buzzsaw", "Leech", "Cookbook"]) {
      s.clicks("runner", 4);
      s.install("runner", c);
    }
    s.clicks("runner", 4);
    s.summon("runner", "Carnivore", "Docklands Pass", "Docklands Pass", "Fermenter", "Wildcat Strike");
    s.credits("runner", 14);
    const chosen: string[] = [];
    for (let i = 0; i < 10 && Number(s.view("runner").runner.click) > 0; i++) {
      const move = s.decide("runner");
      if (!move) {
        const corp = s.decide("corp");
        if (corp) s.play("corp", corp);
        continue;
      }
      if (move.command !== "toast") chosen.push(`${move.command}: ${s.last("runner").chosen?.why ?? ""}`);
      s.play("runner", move);
    }
    expect(chosen.join(" | ")).toMatch(/Fermenter/);
    expect(chosen.join(" | ")).toMatch(/Carnivore/);
    expect(chosen.filter((c) => c.startsWith("draw")).length).toBeLessThan(2);
  });
});

describe("runner installs the breaker it needs before saving for the remote (replay 6TFAXBF3)", () => {
  it("installs Buzzsaw at four credits with Funhouse and Whitespace rezzed on the centrals", () => {
    const s = new Scenario("core-nbn", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Funhouse", "Tithe", "Whitespace", "Tithe", "Whitespace", "Ping", "Palisade", "Tomorrow's Headline");
    s.credits("corp", 40);
    for (const [c, srv] of [["Funhouse", "R&D"], ["Tithe", "R&D"], ["Whitespace", "HQ"], ["Tithe", "HQ"], ["Whitespace", "New remote"], ["Ping", "Server 1"], ["Palisade", "Server 1"], ["Tomorrow's Headline", "Server 1"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.credits("corp", 40);
      s.install("corp", c, srv);
    }
    s.rez("Funhouse");
    s.say("corp", "/rez-free");
    s.act("corp", "Select Tithe");
    s.say("corp", "/rez-free");
    s.act("corp", "Select Whitespace");
    s.credits("corp", 18);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Pennyshaver", "Smartware Distributor", "Smartware Distributor");
    s.credits("runner", 20);
    for (const c of ["Pennyshaver", "Smartware Distributor", "Smartware Distributor"]) {
      s.clicks("runner", 4);
      s.install("runner", c);
    }
    s.clicks("runner", 4);
    s.summon("runner", "Buzzsaw", "Carmen", "Verbal Plasticity", "Red Team", "Overclock");
    s.credits("runner", 4);
    const move = s.decide("runner");
    expect(move?.command).toBe("play");
    expect(s.last("runner").chosen?.why).toMatch(/install Buzzsaw/);
    expect(best(s, "runner", (w) => w.startsWith("run Archives"))).toBeLessThan(35);
  });
});

describe("runner contests the winning agenda", () => {
  it("runs the remote at ten credits when the Corp sits at six points with an advanced card behind two rezzed ice", () => {
    const s = new Scenario("core-weyland", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Kessleroid", "Pharos", "Palisade", "Syailendra", "Orbital Superiority", "Send a Message", "Send a Message");
    s.credits("corp", 40);
    for (const [c, srv] of [["Kessleroid", "R&D"], ["Pharos", "HQ"], ["Palisade", "New remote"], ["Syailendra", "Server 1"], ["Orbital Superiority", "Server 1"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.credits("corp", 40);
      s.install("corp", c, srv);
    }
    s.rez("Palisade");
    s.rez("Syailendra");
    s.clicks("corp", 3);
    s.act("corp", "Orbital Superiority: Advance");
    for (let i = 0; i < 2; i++) {
      s.say("corp", "/score");
      s.act("corp", "Select Send a Message");
      s.act("corp", "Done");
    }
    expect(Number(s.view("corp").corp["agenda-point"])).toBe(6);
    s.credits("corp", 15);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Buzzsaw", "Marjanah", "Carmen", "Docklands Pass", "Smartware Distributor");
    s.credits("runner", 30);
    for (const c of ["Buzzsaw", "Marjanah", "Carmen", "Docklands Pass", "Smartware Distributor"]) {
      s.clicks("runner", 4);
      s.install("runner", c);
    }
    s.clicks("runner", 4);
    s.summon("runner", "T400 Memory Diamond", "VRcation", "Mutual Favor", "Buzzsaw");
    s.credits("runner", 10);
    const move = s.decide("runner");
    expect(move?.command).toBe("run");
    expect(s.last("runner").chosen?.why).toMatch(/run Server 1.*decisive/);
  });
});

describe("runner cashes Pennyshaver", () => {
  function pennyBoard(counters: number) {
    const s = new Scenario("core-hb", "core-criminal");
    centrals(s);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Pennyshaver", "Carmen", "Buzzsaw");
    s.credits("runner", 30);
    for (const c of ["Pennyshaver", "Carmen", "Buzzsaw"]) {
      s.clicks("runner", 4);
      s.install("runner", c);
    }
    s.say("runner", `/counter credit ${counters}`);
    s.act("runner", "Select Pennyshaver");
    s.clicks("runner", 3);
    s.summon("runner", "Jailbreak", "Tread Lightly", "Docklands Pass", "Leech");
    s.credits("runner", 10);
    return s;
  }

  it("takes eight credits from Pennyshaver instead of clicking for one", () => {
    const s = pennyBoard(8);
    const move = s.decide("runner");
    expect(move?.command).toBe("ability");
    expect(s.last("runner").chosen?.why).toMatch(/Pennyshaver: take 9 credits/);
  });

  it("leaves an empty Pennyshaver alone", () => {
    const s = pennyBoard(0);
    s.decide("runner");
    expect(best(s, "runner", (w) => w.startsWith("Pennyshaver"))).toBeLessThan(best(s, "runner", (w) => w.startsWith("take a credit")));
  });
});

describe("corp flooded with agendas on a rich turn", () => {
  function floodedBoard() {
    const s = new Scenario("core-hb", "core-shaper");
    s.clearHand("corp");
    s.summon("corp", "Tithe", "Whitespace", "Whitespace", "Ansel 1.0", "Whitespace", "Ansel 1.0", "Manegarm Skunkworks");
    s.credits("corp", 60);
    for (const [c, srv] of [["Whitespace", "HQ"], ["Whitespace", "HQ"], ["Ansel 1.0", "HQ"], ["Tithe", "R&D"], ["Whitespace", "New remote"], ["Ansel 1.0", "Server 1"], ["Manegarm Skunkworks", "Server 1"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.credits("corp", 60);
      s.install("corp", c, srv);
    }
    s.rez("Whitespace");
    s.rez("Ansel 1.0");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Echelon", "Unity", "Unity", "Echelon");
    s.credits("runner", 40);
    for (const c of ["Echelon", "Unity", "Unity", "Echelon"]) {
      s.clicks("runner", 4);
      s.install("runner", c);
    }
    s.summon("runner", "Sure Gamble", "Jailbreak", "Overclock", "Tread Lightly", "Leech");
    s.credits("runner", 14);
    s.clicks("runner", 0);
    s.endTurn("runner");
    s.clearHand("corp");
    return s;
  }

  it("plays Sprint with four agendas in a seven-card hand instead of clicking for credits", () => {
    const s = floodedBoard();
    s.summon("corp", "Seamless Launch", "Send a Message", "Offworld Office", "Send a Message", "Manegarm Skunkworks", "Offworld Office", "Sprint");
    s.credits("corp", 25);
    s.clicks("corp", 2);
    const move = s.decide("corp");
    expect(move?.command).toBe("play");
    expect(s.last("corp").chosen?.why).toMatch(/^Sprint: three cards, and two of 4 agendas/);
  });

  it("draws at twenty-five credits with six cards and no ice rather than clicking for one", () => {
    const s = floodedBoard();
    s.summon("corp", "Nico Campaign", "Seamless Launch", "Seamless Launch", "Send a Message", "Offworld Office", "Nico Campaign");
    s.credits("corp", 25);
    s.clicks("corp", 2);
    const move = s.decide("corp");
    expect(move?.command).not.toBe("credit");
    expect(best(s, "corp", (w) => w.startsWith("take a credit"))).toBeLessThan(best(s, "corp", (w) => w.startsWith("draw")));
  });
});

describe("corp ices a central the Runner walks into", () => {
  it("puts an ender on R&D when Whitespace alone guards it and the Runner ran it twice", () => {
    const s = new Scenario("core-nbn", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Whitespace", "Tithe", "Funhouse");
    s.credits("corp", 40);
    for (const [c, srv] of [["Whitespace", "R&D"], ["Tithe", "HQ"], ["Funhouse", "HQ"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.install("corp", c, srv);
    }
    s.rez("Whitespace");
    s.rez("Funhouse");
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Buzzsaw", "Marjanah");
    s.credits("runner", 20);
    for (const c of ["Buzzsaw", "Marjanah"]) {
      s.clicks("runner", 4);
      s.install("runner", c);
    }
    s.summon("runner", "Sure Gamble", "Jailbreak", "Overclock");
    s.credits("runner", 12);
    s.clicks("runner", 0);
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Palisade", "Spin Doctor", "Orbital Superiority");
    s.credits("corp", 8);
    s.clicks("corp", 3);
    const turn = Number(s.view("corp").turn);
    s.bots.corp.memory.notes.runsSeen = { "R&D": [turn - 2, turn - 1] };
    const move = s.decide("corp");
    expect(move?.command).toBe("play");
    expect(s.last("corp").chosen?.why).toMatch(/^install Palisade on R&D: ice R&D: the Runner walks in/);
  });
});

describe("corp scores fast when rich instead of waiting for a safe window", () => {
  it("installs Offworld Office behind two rezzable ice at fifteen credits with Seamless Launch in hand although the Runner can get in", () => {
    const s = new Scenario("core-hb", "core-criminal");
    centrals(s);
    s.summon("corp", "Whitespace", "Palisade");
    s.credits("corp", 40);
    for (const [c, srv] of [["Whitespace", "New remote"], ["Palisade", "Server 1"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.install("corp", c, srv);
    }
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Buzzsaw", "Marjanah", "Carmen");
    s.credits("runner", 20);
    for (const c of ["Buzzsaw", "Marjanah", "Carmen"]) {
      s.clicks("runner", 4);
      s.install("runner", c);
    }
    s.summon("runner", "Sure Gamble", "Jailbreak", "Overclock", "Tread Lightly");
    s.credits("runner", 12);
    s.clicks("runner", 0);
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Offworld Office", "Seamless Launch", "Hedge Fund");
    s.credits("corp", 15);
    s.clicks("corp", 2);
    const move = s.decide("corp");
    expect(move?.command).toBe("play");
    expect(s.last("corp").chosen?.why).toMatch(/install Offworld Office behind 2 ice in Server 1 .*scores next turn/);
  });
});

describe("runner counts its clicks against bioroids (replay 4K88K9ZY)", () => {
  function ansel(s: Scenario) {
    s.clearHand("corp");
    s.summon("corp", "Tithe", "Tithe", "Brân 1.0", "Ansel 1.0", "Offworld Office");
    s.credits("corp", 40);
    for (const [c, srv] of [["Tithe", "HQ"], ["Tithe", "R&D"], ["Brân 1.0", "New remote"], ["Ansel 1.0", "Server 1"], ["Offworld Office", "Server 1"]] as [string, string][]) {
      s.clicks("corp", 3);
      s.credits("corp", 40);
      s.install("corp", c, srv);
    }
    s.clicks("corp", 3);
    s.act("corp", "Offworld Office: Advance");
    s.rez("Brân 1.0");
    s.rez("Ansel 1.0");
    s.credits("corp", 6);
    s.clicks("corp", 0);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Smartware Distributor", "Marjanah", "Buzzsaw", "Pennyshaver");
    s.credits("runner", 20);
    for (const c of ["Smartware Distributor", "Marjanah", "Buzzsaw", "Pennyshaver"]) {
      s.clicks("runner", 4);
      s.install("runner", c);
    }
    s.summon("runner", "Tread Lightly", "Overclock", "Sure Gamble", "Jailbreak", "VRcation");
  }

  it("does not run a remote whose Ansel it can only click through when the run would leave no clicks", () => {
    const s = new Scenario("core-hb", "core-criminal");
    ansel(s);
    s.credits("runner", 20);
    s.clicks("runner", 1);
    s.decide("runner");
    expect(best(s, "runner", (w) => w.startsWith("run Server 1"))).toBeLessThan(20);
  });

  it("prices the three clicks through Ansel when it has them", () => {
    const s = new Scenario("core-hb", "core-criminal");
    ansel(s);
    s.credits("runner", 20);
    s.clicks("runner", 4);
    s.decide("runner");
    expect(best(s, "runner", (w) => /^(run Server 1|Overclock into Server 1)/.test(w))).toBeGreaterThan(40);
  });
});

describe("corp keeps its purse early (replay YT9YUQBD)", () => {
  it("does not rez Funhouse for its whole purse under Tread Lightly on turn one", () => {
    const s = new Scenario("core-nbn", "core-criminal");
    s.clearHand("corp");
    s.summon("corp", "Funhouse", "Palisade", "Orbital Superiority", "Hedge Fund", "Spin Doctor");
    s.credits("corp", 10);
    s.install("corp", "Funhouse", "HQ");
    s.install("corp", "Palisade", "R&D");
    s.credits("corp", 8);
    s.clicks("corp", 0);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Tread Lightly", "Sure Gamble", "VRcation", "Marjanah", "Overclock");
    s.credits("runner", 9);
    s.act("runner", "Tread Lightly: Play");
    s.act("runner", "Choose: HQ");
    let why = "";
    for (let i = 0; i < 12 && !why; i++) {
      const move = s.decide("corp");
      if (move) {
        const chosen = s.last("corp").chosen;
        if (chosen?.kind === "rez" || /would leave|keep the credits/.test(chosen?.why ?? "")) why = chosen?.why ?? "";
        s.play("corp", move);
      } else s.runStep("runner");
    }
    expect(why).toMatch(/would leave 0 on turn/);
  });

  it("clicks up to Hedge Fund instead of installing ice on R&D at four credits", () => {
    const s = new Scenario("core-nbn", "core-criminal");
    centrals(s);
    s.endTurn("corp");
    s.clearHand("runner");
    s.summon("runner", "Marjanah", "Buzzsaw");
    s.credits("runner", 20);
    for (const c of ["Marjanah", "Buzzsaw"]) {
      s.clicks("runner", 4);
      s.install("runner", c);
    }
    s.summon("runner", "Sure Gamble", "Jailbreak", "Overclock");
    s.credits("runner", 6);
    s.clicks("runner", 0);
    s.endTurn("runner");
    s.clearHand("corp");
    s.summon("corp", "Hedge Fund", "Ping", "Palisade", "Send a Message");
    s.credits("corp", 4);
    s.clicks("corp", 3);
    const turn = Number(s.view("corp").turn);
    s.bots.corp.memory.notes.runsSeen = { "R&D": [turn - 2, turn - 1] };
    const move = s.decide("corp");
    expect(move?.command).toBe("credit");
    expect(s.last("corp").chosen?.why).toMatch(/economy operation/);
  });
});
