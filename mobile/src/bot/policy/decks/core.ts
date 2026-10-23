import type { Side } from "../../../engine.ts";
import type { DeckList } from "../types.ts";

export interface CoreDeck extends DeckList {
  key: string;
  name: string;
  side: Side;
  faction: string;
  source?: string;
}

export const CORE_FORMAT = "core";

export const CORE_HB: CoreDeck = {
  key: "core-hb",
  name: "Discretion Advised (SG Only)",
  side: "corp",
  faction: "Haas-Bioroid",
  identity: "Haas-Bioroid: Precision Design",
  source: "https://netrunnerdb.com/en/decklist/2e178470-fafa-4dfd-b797-b2413b5cc613",
  cards: [
    { qty: 1, title: "Luminal Transubstantiation" },
    { qty: 3, title: "Offworld Office" },
    { qty: 3, title: "Send a Message" },
    { qty: 1, title: "Superconducting Hub" },
    { qty: 3, title: "Nico Campaign" },
    { qty: 3, title: "Urtica Cipher" },
    { qty: 2, title: "Manegarm Skunkworks" },
    { qty: 3, title: "Government Subsidy" },
    { qty: 3, title: "Hedge Fund" },
    { qty: 3, title: "Predictive Planogram" },
    { qty: 2, title: "Seamless Launch" },
    { qty: 2, title: "Sprint" },
    { qty: 3, title: "Ansel 1.0" },
    { qty: 2, title: "Brân 1.0" },
    { qty: 3, title: "Palisade" },
    { qty: 1, title: "Pharos" },
    { qty: 3, title: "Tithe" },
    { qty: 3, title: "Whitespace" },
  ],
};

export const CORE_JINTEKI: CoreDeck = {
  key: "core-jinteki",
  name: "Advanced Yomi (SG Only)",
  side: "corp",
  faction: "Jinteki",
  identity: "Jinteki: Restoring Humanity",
  source: "https://netrunnerdb.com/en/decklist/c0122ed3-c9b7-446c-bf2b-01e207f22982",
  cards: [
    { qty: 1, title: "Longevity Serum" },
    { qty: 3, title: "Offworld Office" },
    { qty: 2, title: "Orbital Superiority" },
    { qty: 2, title: "Send a Message" },
    { qty: 3, title: "Clearinghouse" },
    { qty: 3, title: "Regolith Mining License" },
    { qty: 3, title: "Spin Doctor" },
    { qty: 3, title: "Urtica Cipher" },
    { qty: 2, title: "Anoetic Void" },
    { qty: 3, title: "Hansei Review" },
    { qty: 3, title: "Hedge Fund" },
    { qty: 1, title: "Ansel 1.0" },
    { qty: 3, title: "Diviner" },
    { qty: 3, title: "Karunā" },
    { qty: 3, title: "Palisade" },
    { qty: 3, title: "Tithe" },
    { qty: 3, title: "Whitespace" },
  ],
};

export const CORE_NBN: CoreDeck = {
  key: "core-nbn",
  name: "Hyper Velocity (SG Only)",
  side: "corp",
  faction: "NBN",
  identity: "NBN: Reality Plus",
  source: "https://netrunnerdb.com/en/decklist/c8f08617-26df-4deb-8fab-415c9dddd9e1",
  cards: [
    { qty: 3, title: "Orbital Superiority" },
    { qty: 3, title: "Send a Message" },
    { qty: 1, title: "Superconducting Hub" },
    { qty: 1, title: "Tomorrow's Headline" },
    { qty: 3, title: "Spin Doctor" },
    { qty: 2, title: "AMAZE Amusements" },
    { qty: 2, title: "Manegarm Skunkworks" },
    { qty: 3, title: "Hansei Review" },
    { qty: 3, title: "Hedge Fund" },
    { qty: 2, title: "Neurospike" },
    { qty: 3, title: "Predictive Planogram" },
    { qty: 3, title: "Public Trail" },
    { qty: 3, title: "Funhouse" },
    { qty: 3, title: "Palisade" },
    { qty: 3, title: "Ping" },
    { qty: 3, title: "Tithe" },
    { qty: 3, title: "Whitespace" },
  ],
};

export const CORE_WEYLAND: CoreDeck = {
  key: "core-weyland",
  name: "Quick and Dirty (SG Only)",
  side: "corp",
  faction: "Weyland Consortium",
  identity: "Weyland Consortium: Built to Last",
  source: "https://netrunnerdb.com/en/decklist/5c7d19c1-ce7b-40ab-811e-e4481078751c",
  cards: [
    { qty: 1, title: "Above the Law" },
    { qty: 3, title: "Offworld Office" },
    { qty: 2, title: "Orbital Superiority" },
    { qty: 2, title: "Send a Message" },
    { qty: 2, title: "Malapert Data Vault" },
    { qty: 3, title: "Government Subsidy" },
    { qty: 3, title: "Hedge Fund" },
    { qty: 3, title: "Predictive Planogram" },
    { qty: 3, title: "Public Trail" },
    { qty: 3, title: "Retribution" },
    { qty: 2, title: "Sprint" },
    { qty: 3, title: "Ballista" },
    { qty: 2, title: "Funhouse" },
    { qty: 3, title: "Palisade" },
    { qty: 3, title: "Pharos" },
    { qty: 3, title: "Tithe" },
    { qty: 3, title: "Whitespace" },
  ],
};

export const CORE_ANARCH: CoreDeck = {
  key: "core-anarch",
  name: "Party Hard (SG Only)",
  side: "runner",
  faction: "Anarch",
  identity: "René \"Loup\" Arcemont: Party Animal",
  source: "https://netrunnerdb.com/en/decklist/4d5bc20d-5ff2-4792-bc79-226d3bb2de8f",
  cards: [
    { qty: 3, title: "Overclock" },
    { qty: 3, title: "Sure Gamble" },
    { qty: 3, title: "Wildcat Strike" },
    { qty: 3, title: "Carnivore" },
    { qty: 2, title: "Docklands Pass" },
    { qty: 3, title: "DZMZ Optimizer" },
    { qty: 3, title: "Botulus" },
    { qty: 2, title: "Buzzsaw" },
    { qty: 2, title: "Carmen" },
    { qty: 2, title: "Cleaver" },
    { qty: 3, title: "Fermenter" },
    { qty: 2, title: "Leech" },
    { qty: 3, title: "Cookbook" },
    { qty: 3, title: "Smartware Distributor" },
    { qty: 3, title: "Verbal Plasticity" },
  ],
};

export const CORE_CRIMINAL: CoreDeck = {
  key: "core-criminal",
  name: "Stolen Goods (SG Only)",
  side: "runner",
  faction: "Criminal",
  identity: "Zahya Sadeghi: Versatile Smuggler",
  source: "https://netrunnerdb.com/en/decklist/e6cfb890-c28d-453b-a8aa-57cda3a7ebf8",
  cards: [
    { qty: 3, title: "Jailbreak" },
    { qty: 2, title: "Mutual Favor" },
    { qty: 3, title: "Overclock" },
    { qty: 3, title: "Sure Gamble" },
    { qty: 3, title: "Tread Lightly" },
    { qty: 3, title: "VRcation" },
    { qty: 2, title: "Docklands Pass" },
    { qty: 3, title: "Pennyshaver" },
    { qty: 1, title: "T400 Memory Diamond" },
    { qty: 2, title: "Buzzsaw" },
    { qty: 2, title: "Carmen" },
    { qty: 1, title: "Conduit" },
    { qty: 2, title: "Leech" },
    { qty: 2, title: "Marjanah" },
    { qty: 3, title: "Red Team" },
    { qty: 3, title: "Smartware Distributor" },
    { qty: 2, title: "Verbal Plasticity" },
  ],
};

export const CORE_SHAPER: CoreDeck = {
  key: "core-shaper",
  name: "Planning Ahead (SG Only)",
  side: "runner",
  faction: "Shaper",
  identity: "Tāo Salonga: Telepresence Magician",
  source: "https://netrunnerdb.com/en/decklist/d14197a6-74dd-47d0-a6e7-886d75153d8d",
  cards: [
    { qty: 3, title: "Creative Commission" },
    { qty: 3, title: "Jailbreak" },
    { qty: 3, title: "Sure Gamble" },
    { qty: 2, title: "Tread Lightly" },
    { qty: 3, title: "VRcation" },
    { qty: 3, title: "DZMZ Optimizer" },
    { qty: 2, title: "Pantograph" },
    { qty: 2, title: "Cleaver" },
    { qty: 2, title: "Conduit" },
    { qty: 2, title: "Echelon" },
    { qty: 2, title: "Mayfly" },
    { qty: 3, title: "Tranquilizer" },
    { qty: 2, title: "Unity" },
    { qty: 3, title: "Smartware Distributor" },
    { qty: 3, title: "Telework Contract" },
    { qty: 2, title: "Verbal Plasticity" },
  ],
};


export const CORE_CORP_DECKS: CoreDeck[] = [CORE_HB, CORE_JINTEKI, CORE_NBN, CORE_WEYLAND];
export const CORE_RUNNER_DECKS: CoreDeck[] = [CORE_ANARCH, CORE_CRIMINAL, CORE_SHAPER];
export const CORE_DECKS: CoreDeck[] = [...CORE_CORP_DECKS, ...CORE_RUNNER_DECKS];

export const coreDeck = (key: string) => CORE_DECKS.find((d) => d.key === key || d.name === key);
