# Quiz Builder — React + Vite

## Features
- Admin and student accounts (demo authentication with Local Storage)
- Admin dashboard with quiz create, edit, delete and quiz codes
- Multiple-choice, True/False and open-ended questions
- Question randomization when a quiz starts
- Automatic score calculation and attempt history
- Admin performance report and student recent attempts
- Responsive layout

## Run in VS Code
1. Extract this ZIP.
2. Open the extracted `quiz-builder-react` folder in VS Code.
3. Open Terminal > New Terminal.
4. Run:

```bash
npm install
npm run dev
```

5. Open the local URL printed in the terminal (usually http://localhost:5173).

## Demo usage
1. Sign up as an Admin / Teacher.
2. Create a quiz and add questions.
3. Note the six-digit join code shown on the Admin dashboard.
4. Sign up as a User / Student in another browser profile, or log out and create a user account.
5. Open the quiz and submit answers.
6. Return to Admin > Quiz reports to see attempts and scores.

## Deploy to Vercel
1. Push the extracted project folder to a new GitHub repository (or replace the old repository after keeping a backup).
2. In Vercel, import the repository.
3. Framework preset: Vite; Build command: `npm run build`; Output directory: `dist`.
4. Deploy.

## Important limitations for project review
This version uses browser Local Storage as required by the current assignment criteria. Local Storage is limited to one browser/device and is not a shared database. Therefore, quiz codes and participation are a local demo flow, not true multi-device real-time synchronization. True real-time participation across devices needs a backend/database and real-time service (for example Firebase or Supabase). Also, open-ended answers are auto-checked by exact case-insensitive text matching; this is suitable for a simple demo, not semantic grading. For production, never store plain-text passwords or rely on client-side role selection for admin security.
