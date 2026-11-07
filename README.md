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
