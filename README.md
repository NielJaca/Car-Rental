# Lovely's Car Rental Web System

A simple car rental system for a small business: customers view cars and availability (monthly calendar) and book via Messenger/Facebook; admins manage cars, mark unavailable dates, and view dashboard statistics.

## Stack

- **Frontend**: React (Vite), React Router, Chart.js. Styling via custom CSS.
- **Backend**: Node.js, Express.js, MongoDB Atlas (Mongoose), session auth (bcrypt, express-session).
- **Database**: MongoDB Atlas.

## Project structure

```
lovely's car rental/
├── backend/          # Node.js + Express API
├── frontend/         # React app (Vite) — customer + admin pages
└── README.md
```

## Setup

### 1. MongoDB Atlas

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and get the connection string.
3. In Network Access, allow your IP (or 0.0.0.0/0 for dev).

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file (copy from `.env.example`):

```env
PORT=3000
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/car-rental?retryWrites=true&w=majority
SESSION_SECRET=your-random-secret
FRONTEND_URL=http://localhost:5500
```

- Replace `USER`, `PASSWORD`, and `CLUSTER` with your Atlas details.
- `FRONTEND_URL` must match the origin you use to open the frontend (e.g. Live Server port 5500, or `http://127.0.0.1:5500`).

Seed the default admin (run once):

```bash
npm run seed
```

Default login: **username** `admin`, **password** `admin123`. Change this in production.

Start the API:

```bash
npm start
```

API base: `http://localhost:3000`. Health check: `GET http://localhost:3000/api/health`.

### 3. Frontend (React)

Run the React app: `cd frontend && npm install && npm run dev`. The dev server runs at `http://localhost:5500` and proxies `/api` to the backend.

### 4. Run both (backend + frontend) from project root

From the **project root** (the folder containing `backend` and `frontend`):

```bash
npm install
npm run dev
```

This starts the backend on port 3000 and the frontend on port 5500 in one command. If you see "Server returned HTML instead of JSON" or "Backend is not running", ensure the backend is running (use `npm run dev` from root, or run `cd backend && npm run dev` in a separate terminal). Alternatively, serve the built `frontend/dist` folder over HTTP (required for CORS and cookies):

- **Option A**: VS Code “Live Server” (often `http://127.0.0.1:5500`). Set `FRONTEND_URL` in backend `.env` to that URL.
- **Option B**: From project root, `npx serve frontend -l 5500`.

Open the site (e.g. `http://127.0.0.1:5500` or `http://localhost:5500`).

With the Vite proxy, the React app uses relative `/api` so no API base URL config is needed in dev.

## Usage

- **Customers**: Open the site → view cars → open a car → see monthly availability (empty = available, car icon = unavailable) → use “Book via Messenger / Facebook” (update `MESSENGER_URL` in `frontend/src/pages/CarDetails.jsx` to your real Facebook/Messenger URL).
- **Admin**: Go to **Admin** → log in → Dashboard (stats + charts), Cars (add/edit/delete, image URL or upload), Availability (select car, click dates to mark/unmark unavailable), Bookings (add manual bookings for Messenger-confirmed reservations).

## Endpoints (summary)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | No | Login |
| POST | /api/auth/logout | Admin | Logout |
| GET | /api/auth/me | Admin | Current session |
| GET | /api/cars | No | List cars |
| GET | /api/cars/:id | No | Car details |
| POST | /api/cars | Admin | Add car |
| PUT | /api/cars/:id | Admin | Update car |
| DELETE | /api/cars/:id | Admin | Delete car |
| POST | /api/cars/:id/upload | Admin | Upload car image |
| GET | /api/availability?carId=&year=&month= | No | Unavailable dates for month |
| POST | /api/availability | Admin | Mark dates unavailable |
| DELETE | /api/availability | Admin | Remove unavailable dates |
| GET | /api/bookings | Admin | List bookings |
| POST | /api/bookings | Admin | Create booking |
| GET | /api/reports/bookings?from=&to=&status=&format= | Admin | Download bookings report (csv/xlsx/pdf) |
| GET | /api/dashboard/stats | Admin | Dashboard stats |
| GET | /api/dashboard/charts/* | Admin | Chart data |

## Reports (Download)

In **Admin → Dashboard**, use **Download Report**:

- **From / To**: date range (optional). Leave blank to export all.
- **Status**: all / pending / confirmed
- **Format**: **PDF**, **Excel (.xlsx)**, or **CSV**

This downloads from `GET /api/reports/bookings` and requires an admin session.

## Optional

- Store images in cloud (e.g. Cloudinary) and save URL in Car.
- Use `connect-mongo` for session store in production.
- Change default admin password after first login.
