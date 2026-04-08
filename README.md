# MediaSave 🎬

> **A production-ready, full-stack video & audio downloader.**  
> Download from YouTube, TikTok, Instagram, Facebook, Twitter/X, Vimeo, and 1000+ sites.

![MediaSave UI](./screenshot-placeholder.png)

---

## 🚀 Quickstart — Run Everything With One Command

> **Requires:** Python 3.10+, Node.js 20+, ffmpeg

```bash
# From the project root:
python start.py
```

That's it. The script will:
1. Auto-create a Python virtual environment in `backend/.venv`
2. Install all Python requirements (`requirements.txt`)
3. Run `npm install` for the frontend if needed
4. Start **both** services simultaneously with colour-coded logs
5. Auto-open **http://localhost:3000** in your browser

| URL | Service |
|---|---|
| http://localhost:3000 | MediaSave UI (Next.js) |
| http://localhost:8000 | FastAPI backend |
| http://localhost:8000/docs | Interactive API docs |

**Windows users** — you can also double-click `start.bat`.

**Optional flags:**
```bash
python start.py --backend-only      # Only start FastAPI
python start.py --frontend-only     # Only start Next.js
python start.py --port-api 9000     # Custom backend port
python start.py --port-web 4000     # Custom frontend port
python start.py --no-browser        # Don't auto-open browser
```

Press **Ctrl+C** to stop all services cleanly.

---


## ⚡ One-Command Local Setup (Docker)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:8000  
- API Docs (Swagger): http://localhost:8000/docs

---

## 🛠 Manual Setup

### Prerequisites
- **Python 3.12+** and **pip**
- **Node.js 20+** and **npm**
- **ffmpeg** installed and on PATH ([download](https://ffmpeg.org/download.html))

---

### Backend (FastAPI)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env

# Run dev server
uvicorn main:app --reload --port 8000
```

The backend will:
1. Check that `yt-dlp` and `ffmpeg` are available on startup
2. Create a temp directory at `TEMP_DIR` (default: `/tmp/video-downloader`)
3. Auto-delete downloaded files after `FILE_TTL_MINUTES` (default: 15 min)

---

### Frontend (Next.js 15)

```bash
cd frontend

# Install dependencies
npm install

# Copy environment config
cp .env.local.example .env.local

# Edit .env.local — set NEXT_PUBLIC_API_URL to your backend URL
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Run dev server
npm run dev
```

App will be available at http://localhost:3000

---

## 📡 API Documentation

| Endpoint | Method | Request Body | Response |
|---|---|---|---|
| `/health` | GET | — | `{ status, yt_dlp_version, ffmpeg_available }` |
| `/api/v1/info` | POST | `{ url: string }` | `{ title, thumbnail, duration, uploader, view_count, platform, formats[] }` |
| `/api/v1/download` | POST | `{ url, format_id, type }` | `{ download_id: string }` |
| `/api/v1/progress/{id}` | GET (SSE) | — | `{ status, percent, speed, eta, filename, download_url? }` |
| `/api/v1/file/{id}` | GET | — | Binary file stream |

### Rate Limits
- `/api/v1/info` → 10 requests/minute per IP
- `/api/v1/download` → 5 requests/minute per IP

### Error Response Format
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": "Optional extra context"
}
```

**Error Codes:**
| Code | HTTP | Description |
|---|---|---|
| `UNSUPPORTED_URL` | 422 | URL not supported by yt-dlp |
| `ACCESS_DENIED` | 403 | Private/age-restricted/geo-blocked |
| `DEPENDENCY_MISSING` | 500 | yt-dlp or ffmpeg not found |
| `DOWNLOAD_TIMEOUT` | 504 | Download exceeded 10 minutes |
| `STORAGE_FULL` | 507 | Disk out of space |

---

## 🚀 Deployment

### Frontend → Vercel
1. Push to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Framework preset: **Next.js** (auto-detected)
4. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`

### Backend → Railway
1. Push to GitHub
2. Create new project → **Deploy from GitHub repo**
3. Select `backend/` as root directory (or use Dockerfile)
4. Set all env vars in Railway dashboard
5. Add a persistent volume mounted at `/tmp/video-downloader`

### Backend → Render.com
1. New Web Service → connect GitHub repo
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add a Disk (1GB) mounted at `/tmp/video-downloader`
5. Set all environment variables

---

## 📦 Project Structure

```
video-downloader/
├── frontend/                # Next.js 15 app
│   ├── app/                 # App Router pages & layout
│   ├── components/          # UI components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # API client, platform detection, history
│   └── types/               # TypeScript types
│
├── backend/                 # FastAPI application
│   ├── main.py              # Entry point
│   ├── routers/             # API route handlers
│   ├── services/            # yt-dlp wrapper, progress store
│   └── middleware/          # Rate limiting
│
└── docker-compose.yml       # Local development setup
```

---

## ⚖️ Legal Disclaimer

> MediaSave is designed for **personal use only**. You are responsible for ensuring that your use of this software complies with the terms of service of the platforms you download content from, as well as applicable copyright laws in your jurisdiction. Do **not** use this tool to download, reproduce, or distribute copyrighted content without explicit permission from the rights holder.

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript 5, Tailwind CSS |
| Animations | Framer Motion 11 |
| Backend | FastAPI 0.115, Python 3.12 |
| Downloader | yt-dlp (latest) |
| Media | ffmpeg |
| Containerization | Docker + Docker Compose |

---

## 📸 Screenshots

> *(Add screenshots here)*

---

Made with ❤️ using [yt-dlp](https://github.com/yt-dlp/yt-dlp)
