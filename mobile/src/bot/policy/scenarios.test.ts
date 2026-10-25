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

  it("will not put an agenda behind 13 credits of unrezzed ice with 14 credits", () => {
    expect(remoteShell(14)).toBeLessThanOrEqual(15);
  });

  it("installs once the cushion is there", () => {
    expect(remoteShell(20)).toBeGreaterThan(30);
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
