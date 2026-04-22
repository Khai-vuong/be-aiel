# 📝 Logging Output Examples - After Refactoring

## Request Flow Logs

### ✅ Successful Request (Sent → Received)

```
[Nest] 13200  - 04/22/2026, 12:15:30 AM     LOG [OuterApiService] [summarization - sent] Provider: auto | Role: system
[Nest] 13200  - 04/22/2026, 12:15:30 AM     LOG [OuterApiService]   Prompt: Summarize the following text in approximately 3-7 words. Keep the most important information and main ideas. Stay concise and clear. Text to summarize: Bạn có thể kiểm tra log để xem có hoạt động nào bất thương không? Summary:...
[Nest] 13200  - 04/22/2026, 12:15:34 AM     LOG [OuterApiService] [summarization - received] Success with gemini (4123ms)
[Nest] 13200  - 04/22/2026, 12:15:34 AM     LOG [OuterApiService]   Response: Check logs for unusual activity....
```

### ❌ Failed Request (Error Handling)

```
[Nest] 13200  - 04/22/2026, 12:16:00 AM     LOG [OuterApiService] [coarse-router - sent] Provider: auto | Role: Admin
[Nest] 13200  - 04/22/2026, 12:16:00 AM     LOG [OuterApiService]   Prompt: You are a routing classifier for the backend AI orchestrator. Return exactly one string that best fits the following guidelines...
[Nest] 13200  - 04/22/2026, 12:16:00 AM     LOG [OuterApiService] [provider-retry] Failure #1: gemini
[Nest] 13200  - 04/22/2026, 12:16:00 AM     LOG [OuterApiService]   Error: 429 Too Many Requests - Rate limit exceeded
[Nest] 13200  - 04/22/2026, 12:16:02 AM     LOG [OuterApiService] [provider-retry] Failure #1: groq
[Nest] 13200  - 04/22/2026, 12:16:02 AM     LOG [OuterApiService]   Error: 503 Service Unavailable
[Nest] 13200  - 04/22/2026, 12:16:04 AM    ERROR [OuterApiService] [coarse-router - error] Failed after 4234ms. Attempted: [gemini, groq, openai]
[Nest] 13200  - 04/22/2026, 12:16:04 AM    ERROR [OuterApiService]   Error: All providers temporarily unavailable
```

### 🔄 Multi-Step ReAct Pipeline

```
[Nest] 13200  - 04/22/2026, 12:16:10 AM     LOG [OuterApiService] [rag-react-planner - sent] Provider: groq | Role: Admin
[Nest] 13200  - 04/22/2026, 12:16:10 AM     LOG [OuterApiService]   Prompt: You are a capability planner for a RAG pipeline. Return ONLY one valid JSON object with shape {id, parameters}. Current loop: 1/3...
[Nest] 13200  - 04/22/2026, 12:16:12 AM     LOG [OuterApiService] [rag-react-planner - received] Success with groq (2145ms)
[Nest] 13200  - 04/22/2026, 12:16:12 AM     LOG [OuterApiService]   Response: {"id":"log-retrive","parameters":{"limit":10,"offset":0}}

[Nest] 13200  - 04/22/2026, 12:16:12 AM     LOG [OuterApiService] [rag-react-reflect - sent] Provider: groq | Role: Admin
[Nest] 13200  - 04/22/2026, 12:16:12 AM     LOG [OuterApiService]   Prompt: You are a reflection step in a ReAct RAG pipeline. Decide if current evidence is enough to answer the question reliably...
[Nest] 13200  - 04/22/2026, 12:16:14 AM     LOG [OuterApiService] [rag-react-reflect - received] Success with groq (1987ms)
[Nest] 13200  - 04/22/2026, 12:16:14 AM     LOG [OuterApiService]   Response: {"needMore": false, "reason": "Đã có đủ thông tin..."}

[Nest] 13200  - 04/22/2026, 12:16:14 AM     LOG [OuterApiService] [rag-react-composer - sent] Provider: groq | Role: Admin
[Nest] 13200  - 04/22/2026, 12:16:14 AM     LOG [OuterApiService]   Prompt: You are the Answer Composer layer in a ReAct pipeline. Use evidence blocks as primary truth source...
[Nest] 13200  - 04/22/2026, 12:16:17 AM     LOG [OuterApiService] [rag-react-composer - received] Success with groq (2834ms)
[Nest] 13200  - 04/22/2026, 12:16:17 AM     LOG [OuterApiService]   Response: Dựa trên các bản ghi log, có một số hoạt động đáng ngờ...
```

---

## 📊 Log Format Comparison

### Before (Verbose & Duplicate)

```
================================================================================
🤖 OUTER API CHAT REQUEST
Provider: groq | Caller: unknown
User Role: Admin | ConversationId: none
System Prompt: You are an AI assistant for an e-learning platform...
Current User Prompt: Your prompt here...
🔄 Calling Provider: GROQ
📝 Formatted Prompt (Groq): Your formatted prompt...
✅ Response from groq: Response content here...
================================================================================
```

**Lines: ~11 | Content: Duplicate & Long-winded**

### After (Concise & Focused)

```
[rag-react-planner - sent] Provider: groq | Role: Admin
  Prompt: You are a capability planner for a RAG pipeline...
[rag-react-planner - received] Success with groq (2145ms)
  Response: {"id":"log-retrive","parameters":{"limit":10,"offset":0}}
```

**Lines: ~4 | Content: Clear & Actionable**

---

## 🎯 Logging Key Features

| Aspect                    | Format                                                               |
| ------------------------- | -------------------------------------------------------------------- |
| **Caller Identification** | `[caller-name]` e.g., `[summarization]`, `[rag-react-planner]`       |
| **Direction**             | `- sent`, `- received`, `- error`                                    |
| **Content Preview**       | First 200 characters, truncated with `...`                           |
| **Timing**                | `(${elapsed}ms)` for performance tracking                            |
| **Multi-line**            | Main info on first line, detailed content on second line with indent |

---

## 💡 Usage Examples for Different Scenarios

### Scenario 1: Content Preview Truncation

```
[rag-react-planner - sent] Provider: groq | Role: Admin
  Prompt: You are a capability planner for a RAG pipeline. Return ONLY one valid JSON object with shape {id, parameters}. with parameters as a JSON object. DO NOT answer the user question. Return exactly one capability call object only.Select only from provided capability catalog. [{"id":"log-retrive","description":"Retrive logs from the system with...
```

### Scenario 2: JSON Response

```
[rag-react-reflect - received] Success with groq (523ms)
  Response: {"needMore": false, "reason": "Đã có đủ thông tin về hoạt động người dùng trong log để xác định hoạt động bất thường", "nextPrompt": ""}
```

### Scenario 3: Long Text Response

```
[rag-react-composer - received] Success with groq (2834ms)
  Response: Dựa trên các bản ghi log, có một số hoạt động đáng ngờ: - `log034`: `access_denied` cho `user001` (vai trò Admin) vào hệ thống, có thể cho thấy một nỗ lực...
```

---

## ✨ Benefits

✅ **Debugging**: Easily identify which caller and direction (sent/received)  
✅ **Content Visibility**: See actual prompts and responses in logs  
✅ **Performance**: Track elapsed time for each request  
✅ **Conciseness**: No verbose separators or emojis cluttering output  
✅ **Consistency**: All logs follow same format regardless of service layer  
✅ **Traceability**: Follow complete request-response flow with timestamps
