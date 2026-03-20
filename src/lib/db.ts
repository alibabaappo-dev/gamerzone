import Database from 'better-sqlite3';

const db = new Database('tournaments.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    isAdmin BOOLEAN NOT NULL DEFAULT 0,
    walletBalance INTEGER NOT NULL DEFAULT 0
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    creatorId INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, completed
    gameType TEXT NOT NULL DEFAULT 'All',
    mode TEXT NOT NULL DEFAULT 'Solo',
    FOREIGN KEY (creatorId) REFERENCES users (id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournamentId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    FOREIGN KEY (tournamentId) REFERENCES tournaments (id),
    FOREIGN KEY (userId) REFERENCES users (id),
    UNIQUE(tournamentId, userId)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournamentId INTEGER NOT NULL,
    round INTEGER NOT NULL,
    matchNumber INTEGER NOT NULL,
    participant1Id INTEGER,
    participant2Id INTEGER,
    winnerId INTEGER,
    score1 INTEGER,
    score2 INTEGER,
    FOREIGN KEY (tournamentId) REFERENCES tournaments (id),
    FOREIGN KEY (participant1Id) REFERENCES participants (id),
    FOREIGN KEY (participant2Id) REFERENCES participants (id),
    FOREIGN KEY (winnerId) REFERENCES participants (id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    message TEXT NOT NULL,
    isRead BOOLEAN NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users (id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- e.g., 'win', 'entry_fee', 'daily_reward'
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users (id)
  );
`);

export default db;
