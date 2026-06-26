# 🫧 Obby Blobs

A cute, pastel 2D **obby** (obstacle climbing) game. Play a smiley little blob and
climb to the top across **5 levels** with **10 checkpoints** each — solo, or online
with a friend using a **room code**.

## ✨ Features

- **Cute blob characters** — armless/legless blobs with big eyes & a smiley mouth.
- **Customise** your skin colour (🪙10 each), accessories (🪙15 each) and faces.
- **Daily Chest** — claim once a day. Every **5th day** is a *rare* chest with
  exclusive rewards (🌈 rainbow & 🌌 galaxy skins, special faces) you can't buy in the shop.
- **Coins** — +5 per checkpoint, +10 for finishing a level. Spend them on cosmetics.
- **Obby mechanics:**
  - Platforms of different sizes (small / normal / big)
  - 💥 **Disappearing blocks** — vanish 5 seconds after you stand on them
  - ➡️ **Conveyor blocks** — automatically push you forward
  - 🤝 **Co-op bridge pads** — in team-up mode, both players must stand on the two
    pads together to make a long bridge appear for 10 seconds
  - ⛳ **Checkpoints** & 🏁 a finish at the very top
- **Mobile controls** — a left/right joystick (bottom-left) and a JUMP button (bottom-right).
  Keyboard works too (←/→ or A/D, Space/↑ to jump).
- **Online multiplayer** — Create a room to get a code, or Join with a friend's code:
  - 🏁 **Race** — same obby, separate climbs, first to the top wins
  - 🤝 **Team-up** — co-op puzzles you solve together
- **Pastel preppy theme** with a pickable background colour (top-right in the lobby).

## 🎮 How to play

1. Type your name in the lobby.
2. Customise your blob and pick a background.
3. Tap **Play** → **Solo Climb**, or **Create / Join Room** to play with a friend.
4. Use the joystick to move and the JUMP button to hop up the platforms.
5. Reach every checkpoint and get to the 🏁 at the top!

## 🛠 Tech

Pure static site — vanilla JS + HTML5 Canvas. Online multiplayer uses **WebRTC**
via PeerJS (peer-to-peer, no backend needed). All progress is saved in your browser's
`localStorage`.

## 🚀 Run locally

It's a static site — serve the folder with any static server, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL.
