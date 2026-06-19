package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func createArticleHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	var req ArticleInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "invalid request", http.StatusBadRequest)
		return
	}

	res, err := db.Exec(
		"INSERT INTO articles (title, category, category_label, difficulty, difficulty_label, read_time, image, content, questions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		req.Title, req.Category, req.CategoryLabel, req.Difficulty, req.DifficultyLabel, req.ReadTime, req.Image, req.Content, req.Questions,
	)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	id, _ := res.LastInsertId()
	respondJSON(w, map[string]int64{"id": id}, http.StatusCreated)
}

func updateArticleHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/articles/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req ArticleInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "invalid request", http.StatusBadRequest)
		return
	}

	_, err = db.Exec(
		"UPDATE articles SET title = ?, category = ?, category_label = ?, difficulty = ?, difficulty_label = ?, read_time = ?, image = ?, content = ?, questions = ? WHERE id = ?",
		req.Title, req.Category, req.CategoryLabel, req.Difficulty, req.DifficultyLabel, req.ReadTime, req.Image, req.Content, req.Questions, id,
	)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]string{"status": "updated"}, http.StatusOK)
}

func deleteArticleHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/articles/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, "invalid id", http.StatusBadRequest)
		return
	}

	_, err = db.Exec("DELETE FROM articles WHERE id = ?", id)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]string{"status": "deleted"}, http.StatusOK)
}

func listUsersHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	rows, err := db.Query(`
		SELECT id, username, COALESCE(name, username), COALESCE(email, ''), role, points, created_at
		FROM users
		ORDER BY id
	`)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []User{}
	for rows.Next() {
		var u User
		rows.Scan(&u.ID, &u.Username, &u.Name, &u.Email, &u.Role, &u.Points, &u.CreatedAt)
		users = append(users, u)
	}

	respondJSON(w, users, http.StatusOK)
}

func deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, "invalid id", http.StatusBadRequest)
		return
	}

	claims := userFromContext(r.Context())
	if id == claims.UserID {
		respondError(w, "cannot delete yourself", http.StatusBadRequest)
		return
	}

	_, err = db.Exec("DELETE FROM users WHERE id = ? AND role != 'admin'", id)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]string{"status": "deleted"}, http.StatusOK)
}
