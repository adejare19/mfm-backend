# MFM Ifesowapo — Backend API

Secure backend for the MFM Ifesowapo church website. Provides admin authentication, file uploads to Supabase Storage, and database-backed content for sermons, events, and resources.

---

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database + Storage**: Supabase (PostgreSQL + Storage)
- **Auth**: JWT (stored in httpOnly cookies)
- **Email**: Nodemailer (SMTP)
- **File Uploads**: Multer (memory storage → Supabase)

---

## Project Structure

```
mfm-backend/
├── src/
│   ├── server.js                  # App entry point
│   ├── config/
│   │   ├── supabase.js            # Supabase client
│   │   └── mailer.js              # Nodemailer config
│   ├── middleware/
│   │   ├── auth.js                # JWT protect middleware
│   │   └── upload.js              # Multer config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── sermonsController.js
│   │   ├── eventsController.js
│   │   ├── resourcesController.js
│   │   └── contactController.js
│   └── routes/
│       ├── auth.js
│       ├── sermons.js
│       ├── events.js
│       ├── resources.js
│       └── contact.js
├── database/
│   └── schema.sql                 # Run this in Supabase SQL Editor
├── scripts/
│   └── createAdmin.js             # One-time admin setup
├── frontend-update/
│   └── church.js                  # Replace existing church.js with this
├── .env.example                   # Copy to .env and fill in values
└── package.json
```

---

## Setup Instructions

### Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the **SQL Editor**, paste and run the entire contents of `database/schema.sql`
3. Go to **Storage** → create a new bucket called `church-media` → set it to **Public**
4. Copy your **Project URL** and **service_role key** from Settings → API

### Step 2 — Clone & Install

```bash
git clone <your-repo>
cd mfm-backend
npm install
```

### Step 3 — Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

### Step 4 — Create Admin Account

```bash
node scripts/createAdmin.js
```

After running, **remove `ADMIN_PASSWORD` from your `.env`** for security.

### Step 5 — Run Locally

```bash
npm run dev   # Development with auto-reload
npm start     # Production
```

---

## Deploy to Render (Free Tier)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Add all variables from `.env.example`
5. Deploy — Render gives you a URL like `https://mfm-backend.onrender.com`

---

## Update the Frontend

1. Replace `church.js` in the frontend repo with `frontend-update/church.js`
2. Set `API_BASE` at the top of the file to your deployed backend URL:
   ```js
   const API_BASE = 'https://mfm-backend.onrender.com/api';
   ```
3. Commit and push — Vercel will auto-redeploy

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login with email + password |
| POST | `/api/auth/logout` | Public | Clear session cookie |
| GET | `/api/auth/verify` | 🔒 Admin | Check if session is valid |

### Sermons
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/sermons` | Public | Get all sermons |
| POST | `/api/sermons` | 🔒 Admin | Upload new sermon |
| DELETE | `/api/sermons/:id` | 🔒 Admin | Delete sermon |

### Events
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/events` | Public | Get all events |
| POST | `/api/events` | 🔒 Admin | Create event |
| DELETE | `/api/events/:id` | 🔒 Admin | Delete event |

### Resources
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/resources` | Public | Get all resources |
| POST | `/api/resources` | 🔒 Admin | Upload resource |
| DELETE | `/api/resources/:id` | 🔒 Admin | Delete resource |

### Contact
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/contact` | Public | Submit contact form |

---

## Security Features

- ✅ Passwords hashed with bcrypt (12 salt rounds)
- ✅ JWT stored in httpOnly, secure, sameSite=strict cookies
- ✅ Rate limiting on login (10 req / 15 min) and contact (5 req / hour)
- ✅ CORS restricted to the Vercel frontend domain only
- ✅ Helmet.js security headers
- ✅ File type and size validation on all uploads
- ✅ No secrets or passwords in client-side code
