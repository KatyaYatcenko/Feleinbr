# Feleinbr

A web application for chatting with AI characters. Users can create their own characters, make them private or public, and talk to them in a natural messenger-style format — without roleplay narration such as `*smiles*`.

The interface and character prompts are designed for Ukrainian.

## Online version

https://feleinbr.vercel.app/

## Main Features

* **User accounts** — registration and login with bcrypt password hashing and JWT authentication.
* **Custom characters** — name, personality description, avatar, and visibility settings.
* **Private and public characters**

  * private characters are available only to their owner;
  * public characters are available to all users;
  * each user has a separate conversation history with public characters.
* **Natural chat style** — the system prompt instructs characters to reply briefly and naturally, without action descriptions in asterisks or brackets.
* **Personalized replies** — characters receive the user's name and gender to generate appropriate forms of address in Ukrainian.
* **Photo messages** — users can attach images to messages.
* **Custom colors** — button, user message, and character message colors can be customized separately.
* **Responsive interface** — separate layouts for desktop and mobile.

## Technologies

| Part           | Technologies                 |
| -------------- | ---------------------------- |
| Frontend       | React 18, Vite, Tailwind CSS |
| Backend        | Node.js, Express             |
| Database       | SQLite, better-sqlite3       |
| Authentication | JWT, bcrypt                  |
| AI             | OpenRouter                   |
| Deployment     | Vercel / Render              |

## Architecture

```text id="5fniww"
feleinbr/
├── src/                          # Frontend
│   ├── components/
│   │   ├── AuthView.jsx          # Registration and login
│   │   ├── ListView.jsx          # Character list
│   │   ├── CreateView.jsx        # Character creation
│   │   ├── ChatView.jsx          # Chat
│   │   ├── SettingsView.jsx      # Settings
│   │   ├── AvatarPicker.jsx      # Avatar selection
│   │   └── Header.jsx
│   ├── api/client.js             # API requests and authentication
│   ├── data/avatars.js           # Avatar gallery
│   ├── utils/colors.js            # Color utilities
│   └── App.jsx
│
└── server/                       # Backend
    ├── index.js                  # Express server
    ├── db.js                     # SQLite connection and schema
    ├── middleware/
    │   └── auth.js               # JWT middleware
    ├── routes/
    │   ├── auth.js               # Registration and login
    │   ├── characters.js         # Character management
    │   ├── messages.js           # Messages and AI requests
    │   └── upload.js             # Image uploads
    └── uploads/                  # Uploaded images
```

## How the AI Chat Works

1. The user sends a message to a character.
2. The backend checks whether the user has access to the character.
3. The message is saved to SQLite.
4. The server builds a system prompt using the character's data and the user's profile.
5. The conversation history and system prompt are sent to OpenRouter.
6. The generated response is saved to the database and returned to the frontend.

Public characters can be used by multiple users, while each user has their own separate conversation history.

## Running Locally

### Requirements

* Node.js 18+
* npm
* OpenRouter API key

### Backend

```bash id="t3briz"
cd server
npm install
cp .env.example .env
```

Add the following to `server/.env`:

```env id="vrrl4e"
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=your_model
JWT_SECRET=your_secret
PORT=3001
```

Start the backend:

```bash id="ws1m6o"
npm start
```

The backend will run at:

```text id="7xrwik"
http://localhost:3001
```

### Frontend

In another terminal:

```bash id="m33sf7"
npm install
npm run dev
```

The frontend will be available at:

```text id="to96kr"
http://localhost:5173
```

## Main API Endpoints

| Method | Endpoint                     | Purpose                  |
| ------ | ---------------------------- | ------------------------ |
| POST   | `/api/auth/register`         | Register a new account   |
| POST   | `/api/auth/login`            | Log in                   |
| GET    | `/api/auth/me`               | Get the current user     |
| GET    | `/api/characters`            | Get available characters |
| POST   | `/api/characters`            | Create a character       |
| DELETE | `/api/characters/:id`        | Delete a character       |
| GET    | `/api/messages/:characterId` | Get conversation history |
| POST   | `/api/messages/:characterId` | Send a message           |
| POST   | `/api/upload`                | Upload an image          |

## Data Storage

The application uses SQLite to store users, characters, and messages.

Uploaded images are also stored on the server.

This is sufficient for local development. On hosting platforms with ephemeral storage, the database and uploaded files require persistent storage; otherwise, they may be lost after a redeploy or server restart.

## Current Limitations

* Characters cannot currently be edited after creation.
* There is no search or filtering for public characters.
* Free AI models may have rate limits.
* Long conversation histories increase the number of tokens sent with each request.
* Production deployment requires persistent storage for SQLite and uploaded files.

## Possible Improvements

* Character editing.
* Search and filtering.
* Pagination for message history.
* API rate limiting.
* Migration from SQLite to PostgreSQL/Supabase.
* Persistent file storage for uploaded images.
* Automated frontend and backend tests.
* Vision-model support for full image understanding.
