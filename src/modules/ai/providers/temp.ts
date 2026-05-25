// Có 2 vấn đề trong code:

// await this.downloadFile(...) ở đầu hàm là thừa — Gemini provider tự tải file rồi, bạn đang tải 2 lần
// 403 — S3 bucket của bạn yêu cầu pre-signed URL cho programmatic access (dù browser tải được vì browser gửi thêm cookie/session)

// Cần dùng AWS SDK để tạo signed URL trước khi truyền vào. Đây là fix cho composeWithGemini và thêm helper getSignedUrl: