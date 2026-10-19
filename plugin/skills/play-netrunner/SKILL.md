---
name: play-netrunner
description: Play a game of Netrunner against a human on Pocket Rig through the pocket-rig MCP tools. Use when the user asks to play Netrunner or Pocket Rig, gives a Pocket Rig game code or join link, or asks to continue a game.
compatibility: Requires the pocket-rig MCP server (plugin/launch.mjs in lelongg/netrunner).
---

# Play Netrunner on Pocket Rig

The `pocket-rig` MCP server (bundled with the Claude Code plugin, or configured in your client)
runs the Jinteki rules engine and talks to the game through the Pocket Rig relay, like a phone
does. Its own instructions cover the rules of the table; this is the order to follow.

1. If the user has not said so, ask in one short message which side you play (Corp or Runner) and
   which format (standard, startup, core, eternal, system-gateway, throwback, casual,
   preconstructed, chimera or quick-draft), or which NetrunnerDB deck to use. When they give a
   game code, the host has already chosen the format: join first and read it from `get_state`.
2. Pick a deck with `find_decks` (recent community decklists for a format) or `list_decks`
   (preconstructed decks), unless the format deals decks (chimera, quick-draft).
3. Join with `join_game(code, deck)`, or host with `host_game(side, deck)` and write the join
   link in your message, then call `wait_for_turn` in the same turn.
4. Loop without ending your turn: `wait_for_turn`, decide, `act`, until the game is over or the
   user tells you to stop. When `wait_for_turn` returns still waiting, times out or is cut off,
   call it again at once: a human may think for half an hour.
5. Call `get_state` whenever you need the whole board, for example after your context was
   summarized, and `card_info` to read a card.

The user is your opponent and reads every word you write: never mention your hand, your deck,
your facedown or unrezzed cards, your agendas or traps, or your plans. Never write the rejoin key
`get_state` shows; if a call says you are not in a game, use it with `join_game` to come back.

The server needs Node 20 or later and outbound HTTPS and WebSocket access to
`lelongg.github.io` and `netrunner-relay.lelong-gerald.workers.dev`. If its tools are missing, or
every call fails to reach the relay, tell the user which of these is missing instead of
retrying.
