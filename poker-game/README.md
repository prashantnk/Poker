# Poker: Zero or One

A modern, real-time multiplayer Poker game designed for **in-person gatherings**.

**The Concept:**
* **The TV (Host):** One device (laptop/TV) hosts the game. It displays the community cards, the pot, QR codes for payments, and the game status.
* **The Phones (Players):** Players scan a QR code to join. Their phone becomes their "hand," allowing them to peek at cards, fold, and reveal.

Built with **Next.js 15**, **Tailwind CSS 4**, and **Supabase Realtime**.

## 🎮 Features

### Host View (TV)
* **Game Management:** Control the flow (Deal, Flop, Turn, River, Showdown).
* **Rigged vs. Fair RNG:** A slider to adjust the randomness of the shuffle (for fun house rules).
* **QR Payments:** Display custom QR codes (e.g., Venmo, UPI) for buying chips.
* **Player Grid:** See who is active, folded, or revealing cards.
* **Zoom Mode:** Click any card or player to view them in massive detail on the big screen.

### Player View (Mobile)
* **Haptic Interaction:** "Hold to Peek" button to simulate lifting real cards.
* **Fold/Reveal:** Real-time status updates synced to the host.
* **Privacy:** Cards remain hidden until the player explicitly interacts.

## 🛠️ Tech Stack

* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS v4
* **Backend & Realtime:** Supabase (PostgreSQL + Realtime Channels)
* **Assets:** DeckOfCardsAPI (standard card visuals)

## 🚀 Getting Started

### 1. Prerequisites
* Node.js 18+
* A [Supabase](https://supabase.com/) project.

### 2. Installation

```bash
git clone [https://github.com/your-username/poker-zero-or-one.git](https://github.com/your-username/poker-zero-or-one.git)
cd poker-game
npm install
```

### 3. Database Setup (Supabase)
* Run the SQL queries found in poker-schema.sql inside your Supabase SQL Editor. This will:

* Create rooms and players tables.

* Enable Row Level Security (RLS).

* Create a storage bucket for QR codes.

* Enable Realtime listening for game updates.

### 4. Environment Variables
* Create a .env.local file in the root directory:

`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
`
5. Run the App
```Bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

🎲 How to Play
Host: Open the app on a large screen and click "HOST TABLE".

Join: Players enter the Room Code shown on the TV (or you can generate a QR code for the URL).

Play:

Host clicks "DEAL" to assign cards to phones.

Host advances the game stages (Flop -> Turn -> River).

Players bet using real chips (or the payment QR).

At Showdown, players can "Reveal" their cards to the TV.