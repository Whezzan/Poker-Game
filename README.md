# Texas Hold'em Poker

A browser-based Texas Hold'em poker game where you play against four computer opponents.

<img width="1913" height="949" alt="image" src="https://github.com/user-attachments/assets/786bd60b-8148-4657-9873-1882632297e4" />

## Features

- Login / registration system (localStorage-based)
- Play Texas Hold'em against 4 AI opponents
- Betting actions: check, call, raise, fold, all-in
- Blind rotation, side pots, and hand evaluation
- Responsive layout

## How to Run

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   cd <repo-name>
   ```

2. **Open in a browser**

   No build step or server is required — just open `index.html` in your browser:

   - **Option A:** Double-click `index.html` in your file explorer.
   - **Option B:** Use a local dev server (recommended for best results):
     ```bash
     # Using VS Code Live Server extension, or:
     npx serve .
     ```

3. **Log in and play**

   Create an account or log in with the default credentials:
   - **Username:** `admin`
   - **Password:** `1234`

   Starting balance is 1 000 SEK.

## Project Structure

```
index.html          – Main HTML page
css/style.css       – Styles
JS/auth.js          – Authentication (localStorage)
JS/game-evaluator.js – Poker hand evaluation
JS/game.js          – Game engine / logic
JS/ui.js            – UI rendering and layout
JS/controller.js    – Wires auth, game engine, and UI together
assets/cards/       – Card images
assets/chips/       – Chip / blind images
```
