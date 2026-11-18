# Yale Rooms

A map for finding a place to work at Yale right now.

Library study rooms come from the public LibCal calendar at [schedule.yale.edu](https://schedule.yale.edu). The app shows which are free and links to the real booking page. It does not make the reservation.

Classrooms, the medical school, the law school, and residential colleges have no public availability feed. Those stay in a directory with the real system and the real wait. Some library spaces need no reservation at all, such as open reading rooms. Those are marked walk-in.

## Run

```bash
npm start
```

Open [http://localhost:8787](http://localhost:8787).

Copy `.env.example` to `.env` if you have a Yale Developer Portal key. Library rooms work without it. Do not commit `.env`.

Availability can lag the library calendar by a few minutes. Times are America/New_York.
