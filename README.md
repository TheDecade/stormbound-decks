# Stormbound Decks

iPad-friendly web app to save Stormbound decklists while you play. Open it in Safari, then Share → **Add to Home Screen**.

- New deck: pick faction, nickname, archetype and type (dropdowns with existing names, or type to create a new one)
- Tap cards to add them (press and hold, or ⤢, to preview); search filters as you type
- Only neutral cards and your faction's cards are listed
- Decks are organised Faction → Archetype → Type
- Data lives in the browser (localStorage). Use **Export backup** / **Import backup** on the deck list to keep a copy.
- **Battle tools** (hand calculator): add the cards an opponent played, turn by turn. **Create deck from played cards** opens a menu
  with **Create fragment**: it keeps the cards as an incomplete list for statistics (not a deck) and needs only the faction. Tap it
  again in the same game to update the fragment. **Fragments (N)** on the deck list shows them, can delete a wrong one, and has a
  **Statistics** view (most used cards; tap a card to see what it goes with).
- **Cards that change the hand:** when you add *Counselor Ahmi* the calculator asks "No surrounding units, so it went back to the hand?".
  Yes keeps it in the opponent's hand for certain (100% right after that turn; the chip shows ↩). Done waits for the answer.
- **Guessed decks:** when the opponent plays cards that no known deck holds, the calculator builds guessed decks from your fragments
  and the known decks (`fragments.js`, a port of the Stormbound project's `stormbound/fragments.py`) and works out the hand on them,
  marked as a guess. The checkbox **Guess a deck when none fits** switches it off. It only uses the fragments saved on this device.
- **Export for PC** shares or downloads one file with all saved decks and all fragments; on the PC,
  `python scripts/import_ipad_decks.py` in the Stormbound project reads it (decks to `data/decks`, fragments to `data/fragments`).
- **Deck types met** (button on the deck list): guesses the type of deck of each opponent from the cards seen in the game, with
  `archetypes.js` (a port of the Stormbound project's `stormbound/archetypes.py`; `tests/test_archetypes_parity.py` there runs both on
  the same cases). The types are weighted card profiles (`archetypes-bundled.json`, made from the files in the project's
  `data/decks/archetypes` by `scripts/export_ipad_decks.py`; the placeholder example is left out, so with no real profile the page says so).
  Tabs: **Types** (faction, archetype and type shares with 90% credible ranges and the number of games each rests on; a type is shown only
  with 3 games' worth of probability), **Games** (one verdict per game), **Matchups** (my deck against opponent faction / archetype / type,
  win rate with a 90% range). Visibility is not corrected yet: a card only shows once it is played.
- **My decks:** a deck marked "A deck I play" (or created with **+ My deck**) is listed under My decks, not among the decks met, and is
  not a candidate for the opponent. Tap ○ to choose the deck you play now (remembered); Battle tools has the same choice on top.
  **New game** asks Won / Lost / Skip (no draws); the result is saved with the deck's name and a copy of its list, on the game's
  fragment (made if the game has cards and a faction) or, otherwise, as a game record. **Export for PC** carries `result`, `my_deck`
  and `my_cards` on each fragment, and the PC importer saves them.
