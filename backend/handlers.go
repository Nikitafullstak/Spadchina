package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

func respondJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, message string, status int) {
	respondJSON(w, map[string]string{"error": message}, status)
}

func enableCORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		enableCORS(w, r)
		return
	}
	enableCORS(w, r)

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "invalid request", http.StatusBadRequest)
		return
	}

	if len(req.Username) < 3 || len(req.Password) < 6 {
		respondError(w, "username min 3 chars, password min 6 chars", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respondError(w, "server error", http.StatusInternalServerError)
		return
	}

	res, err := db.Exec("INSERT INTO users (username, password) VALUES (?, ?)", req.Username, string(hash))
	if err != nil {
		respondError(w, "username already exists", http.StatusConflict)
		return
	}

	id, _ := res.LastInsertId()
	user := User{ID: int(id), Username: req.Username, Role: "user", Points: 0}
	token, err := generateToken(user)
	if err != nil {
		respondError(w, "token error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, TokenResponse{Token: token, User: user}, http.StatusCreated)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		enableCORS(w, r)
		return
	}
	enableCORS(w, r)

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "invalid request", http.StatusBadRequest)
		return
	}

	var user User
	err := db.QueryRow("SELECT id, username, password, role, points FROM users WHERE username = ?", req.Username).
		Scan(&user.ID, &user.Username, &user.Password, &user.Role, &user.Points)
	if err != nil {
		respondError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		respondError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := generateToken(user)
	if err != nil {
		respondError(w, "token error", http.StatusInternalServerError)
		return
	}

	user.Password = ""
	respondJSON(w, TokenResponse{Token: token, User: user}, http.StatusOK)
}

func meHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	claims := userFromContext(r.Context())

	var user User
	err := db.QueryRow("SELECT id, username, role, points FROM users WHERE id = ?", claims.UserID).
		Scan(&user.ID, &user.Username, &user.Role, &user.Points)
	if err != nil {
		respondError(w, "user not found", http.StatusNotFound)
		return
	}

	respondJSON(w, user, http.StatusOK)
}

func getArticlesHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	rows, err := db.Query("SELECT id, title, category, category_label, difficulty, difficulty_label, read_time, image, content, questions FROM articles")
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	articles := []Article{}
	for rows.Next() {
		var a Article
		if err := rows.Scan(&a.ID, &a.Title, &a.Category, &a.CategoryLabel, &a.Difficulty, &a.DifficultyLabel, &a.ReadTime, &a.Image, &a.Content, &a.Questions); err != nil {
			continue
		}
		articles = append(articles, a)
	}

	respondJSON(w, articles, http.StatusOK)
}

func getArticleHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	idStr := strings.TrimPrefix(r.URL.Path, "/api/articles/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, "invalid id", http.StatusBadRequest)
		return
	}

	var a Article
	err = db.QueryRow("SELECT id, title, category, category_label, difficulty, difficulty_label, read_time, image, content, questions FROM articles WHERE id = ?", id).
		Scan(&a.ID, &a.Title, &a.Category, &a.CategoryLabel, &a.Difficulty, &a.DifficultyLabel, &a.ReadTime, &a.Image, &a.Content, &a.Questions)
	if err != nil {
		respondError(w, "not found", http.StatusNotFound)
		return
	}

	respondJSON(w, a, http.StatusOK)
}

func saveResultHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	claims := userFromContext(r.Context())

	var req Result
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "invalid request", http.StatusBadRequest)
		return
	}

	_, err := db.Exec(
		`INSERT INTO results (user_id, article_id, score, max_score) VALUES (?, ?, ?, ?)
		ON CONFLICT(user_id, article_id) DO UPDATE SET score = excluded.score, max_score = excluded.max_score`,
		claims.UserID, req.ArticleID, req.Score, req.MaxScore,
	)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	recalcPoints(claims.UserID)
	respondJSON(w, map[string]string{"status": "ok"}, http.StatusOK)
}

func getMyResultsHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	claims := userFromContext(r.Context())

	rows, err := db.Query("SELECT id, user_id, article_id, score, max_score, created_at FROM results WHERE user_id = ?", claims.UserID)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	results := []Result{}
	for rows.Next() {
		var res Result
		rows.Scan(&res.ID, &res.UserID, &res.ArticleID, &res.Score, &res.MaxScore, &res.CreatedAt)
		results = append(results, res)
	}

	respondJSON(w, results, http.StatusOK)
}

func getProgressHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	claims := userFromContext(r.Context())

	var points, total, completed int
	db.QueryRow("SELECT points FROM users WHERE id = ?", claims.UserID).Scan(&points)
	db.QueryRow("SELECT COUNT(*) FROM articles").Scan(&total)
	db.QueryRow("SELECT COUNT(*) FROM results WHERE user_id = ?", claims.UserID).Scan(&completed)

	respondJSON(w, map[string]interface{}{
		"points":    points,
		"total":     total,
		"completed": completed,
	}, http.StatusOK)
}

func recalcPoints(userID int) {
	var total int
	db.QueryRow("SELECT COALESCE(SUM(score * 10 + CASE WHEN score = max_score THEN 20 WHEN score >= max_score * 0.7 THEN 10 ELSE 0 END), 0) FROM results WHERE user_id = ?", userID).Scan(&total)
	db.Exec("UPDATE users SET points = ? WHERE id = ?", total, userID)
}

func getLeaderboardHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

	rows, err := db.Query(`
		SELECT u.username, u.points,
			COUNT(r.id) AS completed_count,
			COALESCE(SUM(r.score), 0) AS correct_count
		FROM users u
		LEFT JOIN results r ON u.id = r.user_id
		WHERE u.role = 'user'
		GROUP BY u.id
		ORDER BY correct_count DESC, u.points DESC, u.username ASC
		LIMIT 50
	`)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	entries := []LeaderboardEntry{}
	for rows.Next() {
		var e LeaderboardEntry
		if err := rows.Scan(&e.Username, &e.Points, &e.CompletedCount, &e.CorrectCount); err != nil {
			continue
		}
		entries = append(entries, e)
	}

	respondJSON(w, entries, http.StatusOK)
}

func getConversationsHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	claims := userFromContext(r.Context())

	rows, err := db.Query(`
		SELECT u.username, u.points,
			COALESCE((
				SELECT m.text
				FROM messages m
				WHERE (m.sender_id = ? AND m.receiver_id = u.id)
					OR (m.sender_id = u.id AND m.receiver_id = ?)
				ORDER BY m.created_at DESC, m.id DESC
				LIMIT 1
			), '') AS last_message,
			COALESCE((
				SELECT m.created_at
				FROM messages m
				WHERE (m.sender_id = ? AND m.receiver_id = u.id)
					OR (m.sender_id = u.id AND m.receiver_id = ?)
				ORDER BY m.created_at DESC, m.id DESC
				LIMIT 1
			), '') AS last_at,
			(
				SELECT COUNT(*)
				FROM messages m
				WHERE m.sender_id = u.id AND m.receiver_id = ? AND m.is_read = 0
			) AS unread_count
		FROM users u
		WHERE u.id != ? AND u.role = 'user'
		ORDER BY unread_count DESC, last_at DESC, u.points DESC, u.username ASC
	`, claims.UserID, claims.UserID, claims.UserID, claims.UserID, claims.UserID, claims.UserID)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	conversations := []ChatConversation{}
	for rows.Next() {
		var item ChatConversation
		if err := rows.Scan(&item.Username, &item.Points, &item.LastMessage, &item.LastAt, &item.UnreadCount); err != nil {
			continue
		}
		conversations = append(conversations, item)
	}

	respondJSON(w, conversations, http.StatusOK)
}

func chatMessagesHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

	switch r.Method {
	case http.MethodGet:
		getChatMessagesHandler(w, r)
	case http.MethodPost:
		sendChatMessageHandler(w, r)
	default:
		respondError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func getChatMessagesHandler(w http.ResponseWriter, r *http.Request) {
	claims := userFromContext(r.Context())
	peerName := strings.TrimSpace(r.URL.Query().Get("peer"))
	if peerName == "" {
		respondError(w, "peer required", http.StatusBadRequest)
		return
	}

	peerID, ok := findUserIDByUsername(peerName)
	if !ok {
		respondError(w, "user not found", http.StatusNotFound)
		return
	}

	db.Exec("UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?", peerID, claims.UserID)

	rows, err := db.Query(`
		SELECT m.id, su.username, ru.username, m.text, m.is_read, m.created_at
		FROM messages m
		JOIN users su ON su.id = m.sender_id
		JOIN users ru ON ru.id = m.receiver_id
		WHERE (m.sender_id = ? AND m.receiver_id = ?)
			OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.created_at ASC, m.id ASC
	`, claims.UserID, peerID, peerID, claims.UserID)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	messages := []ChatMessage{}
	for rows.Next() {
		var msg ChatMessage
		var readInt int
		if err := rows.Scan(&msg.ID, &msg.Sender, &msg.Receiver, &msg.Text, &readInt, &msg.CreatedAt); err != nil {
			continue
		}
		msg.IsRead = readInt == 1
		messages = append(messages, msg)
	}

	respondJSON(w, messages, http.StatusOK)
}

func sendChatMessageHandler(w http.ResponseWriter, r *http.Request) {
	claims := userFromContext(r.Context())

	var req SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "invalid request", http.StatusBadRequest)
		return
	}

	req.To = strings.TrimSpace(req.To)
	req.Text = strings.TrimSpace(req.Text)
	if req.To == "" || req.Text == "" {
		respondError(w, "recipient and text required", http.StatusBadRequest)
		return
	}
	if len(req.Text) > 1000 {
		respondError(w, "message is too long", http.StatusBadRequest)
		return
	}

	receiverID, ok := findUserIDByUsername(req.To)
	if !ok {
		respondError(w, "user not found", http.StatusNotFound)
		return
	}
	if receiverID == claims.UserID {
		respondError(w, "cannot message yourself", http.StatusBadRequest)
		return
	}

	res, err := db.Exec("INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)", claims.UserID, receiverID, req.Text)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	id, _ := res.LastInsertId()
	respondJSON(w, map[string]interface{}{"id": id, "status": "sent"}, http.StatusCreated)
}

func getUnreadCountHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	claims := userFromContext(r.Context())

	var count int
	db.QueryRow("SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND is_read = 0", claims.UserID).Scan(&count)
	respondJSON(w, UnreadResponse{UnreadCount: count}, http.StatusOK)
}

func findUserIDByUsername(username string) (int, bool) {
	var id int
	err := db.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, false
		}
		return 0, false
	}
	return id, true
}

func duelsHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

	switch r.Method {
	case http.MethodGet:
		getDuelsHandler(w, r)
	case http.MethodPost:
		createDuelHandler(w, r)
	default:
		respondError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func getDuelsHandler(w http.ResponseWriter, r *http.Request) {
	claims := userFromContext(r.Context())
	rows, err := db.Query(`
		SELECT d.id, cu.username, ou.username, d.status, d.questions,
			d.challenger_score, d.opponent_score, COALESCE(wu.username, ''),
			d.created_at, d.updated_at
		FROM duels d
		JOIN users cu ON cu.id = d.challenger_id
		JOIN users ou ON ou.id = d.opponent_id
		LEFT JOIN users wu ON wu.id = d.winner_id
		WHERE d.challenger_id = ? OR d.opponent_id = ?
		ORDER BY d.updated_at DESC, d.id DESC
		LIMIT 30
	`, claims.UserID, claims.UserID)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	duels := []Duel{}
	for rows.Next() {
		duel, ok := scanDuel(rows)
		if ok {
			duels = append(duels, duel)
		}
	}
	respondJSON(w, duels, http.StatusOK)
}

func createDuelHandler(w http.ResponseWriter, r *http.Request) {
	claims := userFromContext(r.Context())

	var req DuelCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "invalid request", http.StatusBadRequest)
		return
	}

	opponentName := strings.TrimSpace(req.Opponent)
	opponentID, ok := findUserIDByUsername(opponentName)
	if !ok {
		respondError(w, "user not found", http.StatusNotFound)
		return
	}
	if opponentID == claims.UserID {
		respondError(w, "cannot duel yourself", http.StatusBadRequest)
		return
	}

	questions, err := buildDuelQuestions()
	if err != nil {
		respondError(w, "not enough questions", http.StatusInternalServerError)
		return
	}
	questionsJSON, _ := json.Marshal(questions)

	res, err := db.Exec(`
		INSERT INTO duels (challenger_id, opponent_id, questions)
		VALUES (?, ?, ?)
	`, claims.UserID, opponentID, string(questionsJSON))
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	duelID, _ := res.LastInsertId()
	db.Exec(
		"INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)",
		claims.UserID,
		opponentID,
		fmt.Sprintf("Бросил вызов на культурную дуэль #%d. Открой вкладку «Батлы», чтобы принять.", duelID),
	)

	respondJSON(w, map[string]interface{}{"id": duelID, "status": "pending"}, http.StatusCreated)
}

func duelActionHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/duels/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		respondError(w, "duel id required", http.StatusBadRequest)
		return
	}

	duelID, err := strconv.Atoi(parts[0])
	if err != nil {
		respondError(w, "invalid duel id", http.StatusBadRequest)
		return
	}

	if r.Method == http.MethodGet && len(parts) == 1 {
		getDuelHandler(w, r, duelID)
		return
	}
	if r.Method == http.MethodPost && len(parts) == 2 {
		switch parts[1] {
		case "accept":
			acceptDuelHandler(w, r, duelID)
		case "decline":
			declineDuelHandler(w, r, duelID)
		case "finish":
			finishDuelHandler(w, r, duelID)
		default:
			respondError(w, "unknown duel action", http.StatusNotFound)
		}
		return
	}

	respondError(w, "method not allowed", http.StatusMethodNotAllowed)
}

func getDuelHandler(w http.ResponseWriter, r *http.Request, duelID int) {
	claims := userFromContext(r.Context())
	duel, ok := getDuelForUser(duelID, claims.UserID)
	if !ok {
		respondError(w, "duel not found", http.StatusNotFound)
		return
	}
	respondJSON(w, duel, http.StatusOK)
}

func acceptDuelHandler(w http.ResponseWriter, r *http.Request, duelID int) {
	claims := userFromContext(r.Context())
	res, err := db.Exec(`
		UPDATE duels
		SET status = 'active', updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND opponent_id = ? AND status = 'pending'
	`, duelID, claims.UserID)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		respondError(w, "duel cannot be accepted", http.StatusBadRequest)
		return
	}
	respondJSON(w, map[string]string{"status": "active"}, http.StatusOK)
}

func updateDuelStatusHandler(w http.ResponseWriter, r *http.Request, duelID int, status string) {
	claims := userFromContext(r.Context())
	res, err := db.Exec(`
		UPDATE duels
		SET status = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND opponent_id = ? AND status = 'pending'
	`, status, duelID, claims.UserID)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		respondError(w, "duel cannot be updated", http.StatusBadRequest)
		return
	}
	respondJSON(w, map[string]string{"status": status}, http.StatusOK)
}

func declineDuelHandler(w http.ResponseWriter, r *http.Request, duelID int) {
	claims := userFromContext(r.Context())

	tx, err := db.Begin()
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var challengerID int
	err = tx.QueryRow(`
		SELECT challenger_id
		FROM duels
		WHERE id = ? AND opponent_id = ? AND status = 'pending'
	`, duelID, claims.UserID).Scan(&challengerID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondError(w, "duel cannot be updated", http.StatusBadRequest)
			return
		}
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	res, err := tx.Exec(`
		UPDATE duels
		SET status = 'declined', updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND opponent_id = ? AND status = 'pending'
	`, duelID, claims.UserID)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		respondError(w, "duel cannot be updated", http.StatusBadRequest)
		return
	}

	_, err = tx.Exec(
		"INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)",
		claims.UserID,
		challengerID,
		fmt.Sprintf("%s отклонил твой вызов на культурную дуэль #%d.", claims.Username, duelID),
	)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]string{"status": "declined"}, http.StatusOK)
}

func finishDuelHandler(w http.ResponseWriter, r *http.Request, duelID int) {
	claims := userFromContext(r.Context())
	duel, ok := getDuelForUser(duelID, claims.UserID)
	if !ok || duel.Status != "active" {
		respondError(w, "duel not active", http.StatusBadRequest)
		return
	}

	var req DuelFinishRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "invalid request", http.StatusBadRequest)
		return
	}

	score := scoreDuelAnswers(duel.Questions, req.Answers)
	var query string
	if claims.Username == duel.Challenger {
		query = "UPDATE duels SET challenger_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND challenger_score = -1"
	} else {
		query = "UPDATE duels SET opponent_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND opponent_score = -1"
	}
	res, err := db.Exec(query, score, duelID)
	if err != nil {
		respondError(w, "db error", http.StatusInternalServerError)
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		respondError(w, "duel already finished by you", http.StatusBadRequest)
		return
	}

	finalizeDuelIfReady(duelID)
	nextDuel, _ := getDuelForUser(duelID, claims.UserID)
	respondJSON(w, nextDuel, http.StatusOK)
}

func getDuelForUser(duelID int, userID int) (Duel, bool) {
	row := db.QueryRow(`
		SELECT d.id, cu.username, ou.username, d.status, d.questions,
			d.challenger_score, d.opponent_score, COALESCE(wu.username, ''),
			d.created_at, d.updated_at
		FROM duels d
		JOIN users cu ON cu.id = d.challenger_id
		JOIN users ou ON ou.id = d.opponent_id
		LEFT JOIN users wu ON wu.id = d.winner_id
		WHERE d.id = ? AND (d.challenger_id = ? OR d.opponent_id = ?)
	`, duelID, userID, userID)

	duel, ok := scanDuel(row)
	return duel, ok
}

type duelScanner interface {
	Scan(dest ...interface{}) error
}

func scanDuel(scanner duelScanner) (Duel, bool) {
	var duel Duel
	var questionsRaw string
	err := scanner.Scan(
		&duel.ID,
		&duel.Challenger,
		&duel.Opponent,
		&duel.Status,
		&questionsRaw,
		&duel.ChallengerScore,
		&duel.OpponentScore,
		&duel.Winner,
		&duel.CreatedAt,
		&duel.UpdatedAt,
	)
	if err != nil {
		return Duel{}, false
	}
	json.Unmarshal([]byte(questionsRaw), &duel.Questions)
	return duel, true
}

func buildDuelQuestions() ([]DuelQuestion, error) {
	rows, err := db.Query("SELECT category, category_label, questions FROM articles ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	questions := []DuelQuestion{}
	for rows.Next() {
		var category, label, raw string
		if err := rows.Scan(&category, &label, &raw); err != nil {
			continue
		}
		var articleQuestions []DuelQuestion
		if err := json.Unmarshal([]byte(raw), &articleQuestions); err != nil {
			continue
		}
		for _, question := range articleQuestions {
			question.Category = category
			question.CategoryLabel = label
			questions = append(questions, question)
			if len(questions) == 5 {
				return questions, nil
			}
		}
	}
	if len(questions) < 5 {
		return nil, fmt.Errorf("not enough questions")
	}
	return questions[:5], nil
}

func scoreDuelAnswers(questions []DuelQuestion, answers []DuelAnswer) int {
	answerMap := map[int]DuelAnswer{}
	for _, answer := range answers {
		answerMap[answer.QuestionID] = answer
	}

	total := 0
	for _, question := range questions {
		answer, ok := answerMap[question.ID]
		if !ok {
			continue
		}
		if isDuelAnswerCorrect(question.Correct, answer.Selected) {
			timeLeft := answer.TimeLeft
			if timeLeft < 0 {
				timeLeft = 0
			}
			if timeLeft > 15 {
				timeLeft = 15
			}
			total += 100 + timeLeft*5
		}
	}
	return total
}

func isDuelAnswerCorrect(correct interface{}, selected []int) bool {
	switch value := correct.(type) {
	case float64:
		return len(selected) == 1 && selected[0] == int(value)
	case []interface{}:
		correctList := []int{}
		for _, item := range value {
			if n, ok := item.(float64); ok {
				correctList = append(correctList, int(n))
			}
		}
		return reflect.DeepEqual(sortedInts(correctList), sortedInts(selected))
	default:
		return false
	}
}

func sortedInts(values []int) []int {
	next := append([]int{}, values...)
	for i := 0; i < len(next); i++ {
		for j := i + 1; j < len(next); j++ {
			if next[j] < next[i] {
				next[i], next[j] = next[j], next[i]
			}
		}
	}
	return next
}

func finalizeDuelIfReady(duelID int) {
	var challengerID, opponentID, challengerScore, opponentScore int
	var status string
	err := db.QueryRow(`
		SELECT challenger_id, opponent_id, status, challenger_score, opponent_score
		FROM duels WHERE id = ?
	`, duelID).Scan(&challengerID, &opponentID, &status, &challengerScore, &opponentScore)
	if err != nil || status != "active" || challengerScore < 0 || opponentScore < 0 {
		return
	}

	winnerID := 0
	if challengerScore > opponentScore {
		winnerID = challengerID
	} else if opponentScore > challengerScore {
		winnerID = opponentID
	}

	if winnerID > 0 {
		db.Exec("UPDATE users SET points = points + 40 WHERE id = ?", winnerID)
		db.Exec(`
			UPDATE duels
			SET status = 'completed', winner_id = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`, winnerID, duelID)
		return
	}

	db.Exec("UPDATE duels SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", duelID)
}
