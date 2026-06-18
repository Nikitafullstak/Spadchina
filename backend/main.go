package main

import (
	"log"
	"net/http"
	"strings"
)

func main() {
	initDB()
	defer db.Close()

	mux := http.NewServeMux()

	// Auth
	mux.HandleFunc("/api/register", registerHandler)
	mux.HandleFunc("/api/login", loginHandler)
	mux.HandleFunc("/api/me", authMiddleware(meHandler))

	// Articles public
	mux.HandleFunc("/api/articles", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/articles/") {
			getArticleHandler(w, r)
			return
		}
		getArticlesHandler(w, r)
	})

	// Results
	mux.HandleFunc("/api/results", authMiddleware(saveResultHandler))
	mux.HandleFunc("/api/results/my", authMiddleware(getMyResultsHandler))
	mux.HandleFunc("/api/progress", authMiddleware(getProgressHandler))

	// Leaderboard
	mux.HandleFunc("/api/leaderboard", getLeaderboardHandler)

	// Chat
	mux.HandleFunc("/api/chat/conversations", authMiddleware(getConversationsHandler))
	mux.HandleFunc("/api/chat/messages", authMiddleware(chatMessagesHandler))
	mux.HandleFunc("/api/chat/unread", authMiddleware(getUnreadCountHandler))

	// Duels
	mux.HandleFunc("/api/duels", authMiddleware(duelsHandler))
	mux.HandleFunc("/api/duels/", authMiddleware(duelActionHandler))

	// Team battles
	mux.HandleFunc("/api/team-battles", authMiddleware(teamBattlesHandler))
	mux.HandleFunc("/api/team-battles/", authMiddleware(teamBattleActionHandler))

	// Admin
	mux.HandleFunc("/api/admin/articles", adminMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			createArticleHandler(w, r)
		} else {
			respondError(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/admin/articles/", adminMiddleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPut:
			updateArticleHandler(w, r)
		case http.MethodDelete:
			deleteArticleHandler(w, r)
		default:
			respondError(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/admin/users", adminMiddleware(listUsersHandler))
	mux.HandleFunc("/api/admin/users/", adminMiddleware(deleteUserHandler))

	// CORS preflight global
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r)
		w.WriteHeader(http.StatusNotFound)
	})

	log.Println("Server starting on http://127.0.0.1:8081")
	log.Println("Admin credentials: admin / admin123")
	log.Fatal(http.ListenAndServe("127.0.0.1:8081", mux))
}
