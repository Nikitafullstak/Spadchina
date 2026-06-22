package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func suggestionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		enableCORS(w, r)
		return
	}
	enableCORS(w, r)

	if r.Method != http.MethodPost {
		respondError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SuggestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "invalid request", http.StatusBadRequest)
		return
	}

	message := strings.TrimSpace(req.Message)
	if len([]rune(message)) < 8 {
		respondError(w, "message is too short", http.StatusBadRequest)
		return
	}
	if len([]rune(message)) > 2000 {
		respondError(w, "message is too long", http.StatusBadRequest)
		return
	}

	if err := sendSuggestionToTelegram(req); err != nil {
		respondError(w, err.Error(), http.StatusBadGateway)
		return
	}

	respondJSON(w, map[string]string{"status": "sent"}, http.StatusOK)
}

func sendSuggestionToTelegram(req SuggestionRequest) error {
	token := strings.TrimSpace(os.Getenv("TELEGRAM_IDEAS_BOT_TOKEN"))
	if token == "" {
		token = strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN"))
	}
	chatID := strings.TrimSpace(os.Getenv("TELEGRAM_IDEAS_CHAT_ID"))
	if chatID == "" {
		chatID = strings.TrimSpace(os.Getenv("TELEGRAM_CHAT_ID"))
	}
	if chatID == "" {
		chatID = getTelegramIdeasChatID()
	}
	if chatID == "" {
		return fmt.Errorf("telegram ideas chat id is not configured")
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "Гость"
	}

	email := strings.TrimSpace(req.Email)
	if email == "" {
		email = "не указан"
	}

	text := fmt.Sprintf("💡 Новая идея со Спадчыны\n\n👤 От: %s\n✉️ Email: %s\n\n📝 Сообщение:\n%s", name, email, strings.TrimSpace(req.Message))
	return sendTelegramMessageWithToken(token, chatID, text)
}
