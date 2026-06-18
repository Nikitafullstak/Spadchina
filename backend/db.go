package main

import (
	"database/sql"
	"log"

	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

var db *sql.DB

func initDB() {
	var err error
	db, err = sql.Open("sqlite", "./cultcode.db")
	if err != nil {
		log.Fatal(err)
	}

	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			points INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS articles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			category TEXT NOT NULL,
			category_label TEXT NOT NULL,
			difficulty TEXT NOT NULL,
			difficulty_label TEXT NOT NULL,
			read_time INTEGER NOT NULL,
			image TEXT,
			content TEXT NOT NULL,
			questions TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS results (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			article_id INTEGER NOT NULL,
			score INTEGER NOT NULL,
			max_score INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id),
			FOREIGN KEY (article_id) REFERENCES articles(id),
			UNIQUE(user_id, article_id)
		);`,
		`CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sender_id INTEGER NOT NULL,
			receiver_id INTEGER NOT NULL,
			text TEXT NOT NULL,
			is_read INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (sender_id) REFERENCES users(id),
			FOREIGN KEY (receiver_id) REFERENCES users(id)
		);`,
		`CREATE TABLE IF NOT EXISTS duels (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			challenger_id INTEGER NOT NULL,
			opponent_id INTEGER NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			questions TEXT NOT NULL,
			challenger_score INTEGER NOT NULL DEFAULT -1,
			opponent_score INTEGER NOT NULL DEFAULT -1,
			winner_id INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (challenger_id) REFERENCES users(id),
			FOREIGN KEY (opponent_id) REFERENCES users(id),
			FOREIGN KEY (winner_id) REFERENCES users(id)
		);`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			log.Fatal(err)
		}
	}

	createAdmin()
	seedArticles()
}

func createAdmin() {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'admin'").Scan(&count)
	if err != nil {
		log.Fatal(err)
	}

	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		_, err := db.Exec(
			"INSERT INTO users (username, password, role, points) VALUES (?, ?, ?, ?)",
			"admin", string(hash), "admin", 0,
		)
		if err != nil {
			log.Fatal(err)
		}
		log.Println("Admin created: username=admin, password=admin123")
	}
}
