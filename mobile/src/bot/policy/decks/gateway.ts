import type { DeckList } from "../types.ts";

export const GATEWAY_CORP_BEGINNER: DeckList = {
  identity: "The Syndicate: Profit over Principle",
  cards: [
    { qty: 3, title: "Offworld Office" },
    { qty: 2, title: "Send a Message" },
    { qty: 2, title: "Superconducting Hub" },
    { qty: 2, title: "Nico Campaign" },
    { qty: 2, title: "Regolith Mining License" },
    { qty: 2, title: "Urtica Cipher" },
    { qty: 2, title: "Government Subsidy" },
    { qty: 3, title: "Hedge Fund" },
    { qty: 2, title: "Seamless Launch" },
    { qty: 1, title: "Manegarm Skunkworks" },
    { qty: 2, title: "Brân 1.0" },
    { qty: 3, title: "Palisade" },
    { qty: 2, title: "Diviner" },
    { qty: 2, title: "Whitespace" },
    { qty: 2, title: "Karunā" },
    { qty: 2, title: "Tithe" },
  ],
};

export const GATEWAY_CORP_INTERMEDIATE: DeckList = {
  identity: "The Syndicate: Profit over Principle",
  cards: [
    ...GATEWAY_CORP_BEGINNER.cards,
    { qty: 2, title: "Orbital Superiority" },
    { qty: 2, title: "Predictive Planogram" },
    { qty: 2, title: "Public Trail" },
    { qty: 1, title: "Retribution" },
    { qty: 1, title: "AMAZE Amusements" },
    { qty: 2, title: "Funhouse" },
  ],
};

export const GATEWAY_RUNNER_BEGINNER: DeckList = {
  identity: "The Catalyst: Convention Breaker",
  cards: [
    { qty: 2, title: "Creative Commission" },
    { qty: 3, title: "Jailbreak" },
    { qty: 2, title: "Overclock" },
    { qty: 3, title: "Sure Gamble" },
    { qty: 2, title: "Tread Lightly" },
    { qty: 2, title: "VRcation" },
    { qty: 1, title: "Docklands Pass" },
    { qty: 1, title: "Pennyshaver" },
    { qty: 1, title: "Red Team" },
    { qty: 2, title: "Smartware Distributor" },
    { qty: 2, title: "Telework Contract" },
    { qty: 1, title: "Verbal Plasticity" },
    { qty: 2, title: "Carmen" },
    { qty: 2, title: "Cleaver" },
    { qty: 2, title: "Mayfly" },
    { qty: 2, title: "Unity" },
  ],
};

export const GATEWAY_RUNNER_INTERMEDIATE: DeckList = {
  identity: "The Catalyst: Convention Breaker",
  cards: [
    ...GATEWAY_RUNNER_BEGINNER.cards,
    { qty: 2, title: "Mutual Favor" },
    { qty: 2, title: "Wildcat Strike" },
    { qty: 2, title: "DZMZ Optimizer" },
    { qty: 2, title: "Conduit" },
    { qty: 2, title: "Leech" },
  ],
};
