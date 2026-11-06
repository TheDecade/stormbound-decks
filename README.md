# Stormbound Decks

iPad-friendly web app to save Stormbound decklists while you play. Open it in Safari, then Share → **Add to Home Screen**.

- New deck: pick faction, nickname, archetype and type (dropdowns with existing names, or type to create a new one)
- Tap cards to add them (press and hold, or ⤢, to preview); search filters as you type
- Only neutral cards and your faction's cards are listed
- Decks are organised Faction → Archetype → Type
- Data lives in the browser (localStorage). Use **Export backup** / **Import backup** on the deck list to keep a copy.
- **Battle tools** (hand calculator): add the cards an opponent played, turn by turn. **Create deck from played cards** opens a menu
  with **Create fragment**: it keeps the cards as an incomplete list for statistics (not a deck) and needs only the faction. Tap it
  again in the same game to update the fragment. **Fragments (N)** on the deck list shows them and can delete a wrong one.
- **Export for PC** shares or downloads one file with all saved decks and all fragments; on the PC,
  `python scripts/import_ipad_decks.py` in the Stormbound project reads it (decks to `data/decks`, fragments to `data/fragments`).
