package main

import "time"

type User struct {
	ID        int       `json:"id"`
	Username  string    `json:"username"`
	Password  string    `json:"-"`
	Role      string    `json:"role"`
	Points    int       `json:"points"`
	CreatedAt time.Time `json:"created_at"`
}

type Article struct {
	ID              int    `json:"id"`
	Title           string `json:"title"`
	Category        string `json:"category"`
	CategoryLabel   string `json:"categoryLabel"`
	Difficulty      string `json:"difficulty"`
	DifficultyLabel string `json:"difficultyLabel"`
	ReadTime        int    `json:"readTime"`
	Image           string `json:"image"`
	Content         string `json:"content"`   // JSON string
	Questions       string `json:"questions"` // JSON string
}

type ArticleInput struct {
	Title           string `json:"title"`
	Category        string `json:"category"`
	CategoryLabel   string `json:"categoryLabel"`
	Difficulty      string `json:"difficulty"`
	DifficultyLabel string `json:"difficultyLabel"`
	ReadTime        int    `json:"readTime"`
	Image           string `json:"image"`
	Content         string `json:"content"`
	Questions       string `json:"questions"`
}

type Result struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	ArticleID int       `json:"article_id"`
	Score     int       `json:"score"`
	MaxScore  int       `json:"max_score"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type TokenResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type LeaderboardEntry struct {
	Username       string `json:"username"`
	Points         int    `json:"points"`
	CompletedCount int    `json:"completed_count"`
	CorrectCount   int    `json:"correct_count"`
}

type ChatMessage struct {
	ID        int    `json:"id"`
	Sender    string `json:"sender"`
	Receiver  string `json:"receiver"`
	Text      string `json:"text"`
	IsRead    bool   `json:"is_read"`
	CreatedAt string `json:"created_at"`
}

type ChatConversation struct {
	Username    string `json:"username"`
	Points      int    `json:"points"`
	LastMessage string `json:"last_message"`
	LastAt      string `json:"last_at"`
	UnreadCount int    `json:"unread_count"`
}

type SendMessageRequest struct {
	To   string `json:"to"`
	Text string `json:"text"`
}

type UnreadResponse struct {
	UnreadCount int `json:"unread_count"`
}

type Duel struct {
	ID              int            `json:"id"`
	Challenger      string         `json:"challenger"`
	Opponent        string         `json:"opponent"`
	Status          string         `json:"status"`
	Questions       []DuelQuestion `json:"questions"`
	ChallengerScore int            `json:"challenger_score"`
	OpponentScore   int            `json:"opponent_score"`
	Winner          string         `json:"winner"`
	CreatedAt       string         `json:"created_at"`
	UpdatedAt       string         `json:"updated_at"`
}

type DuelQuestion struct {
	ID            int         `json:"id"`
	Type          string      `json:"type"`
	Question      string      `json:"question"`
	Options       []string    `json:"options"`
	Correct       interface{} `json:"correct"`
	Category      string      `json:"category"`
	CategoryLabel string      `json:"category_label"`
}

type DuelCreateRequest struct {
	Opponent string `json:"opponent"`
}

type DuelAnswer struct {
	QuestionID int   `json:"question_id"`
	Selected   []int `json:"selected"`
	TimeLeft   int   `json:"time_left"`
}

type DuelFinishRequest struct {
	Answers []DuelAnswer `json:"answers"`
}
