# Contact form Worker (`momoshare-contact`)

Backend nhận form liên hệ của `contact.html` và chuyển thông tin sang Telegram.

## Trạng thái sao lưu

- `src/worker.js` là bản sao **nguyên văn** mã đang chạy trên Cloudflare, tải về bằng API chỉ đọc ngày 20/11/2026.
- Lần triển khai cuối trên Cloudflare: 22/09/2026, sửa trực tiếp bằng Dashboard (Quick Editor). Trước ngày sao lưu, mã này không có trong Git.
- Sao lưu này **chưa được deploy lại** từ repo. Nếu ai đó tiếp tục sửa trên Dashboard, bản trong repo sẽ lệch; trước khi sửa hoặc deploy, tải mã đang chạy về và so sánh.

## Cấu hình đang chạy (đã đọc qua API ngày 20/11/2026)

- Tên Worker: `momoshare-contact`; `compatibility_date`: `2026-09-22`.
- Gọi qua địa chỉ `*.workers.dev` (đang bật, và cần bật vì `contact.html` dùng địa chỉ này). Không có route trên `yenhaitran.com`, không có cron.
- Secret: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Giá trị chỉ lưu trong Cloudflare Secrets; không đưa vào Git, log hay hội thoại.

## Cách hoạt động

1. Chỉ nhận `POST /` có header `Origin` là `https://yenhaitran.com` hoặc `https://www.yenhaitran.com`; `OPTIONS` trả CORS.
2. Thiếu secret → 503. JSON lỗi → 400.
3. Ô bẫy `website` có giá trị → trả `ok` nhưng không gửi (chống bot).
4. Bắt buộc `name` và `phone`; cắt độ dài `type` 80, `name` 120, `phone` 80, `email` 160, `message` 2000 ký tự.
5. Gửi tin nhắn qua Telegram Bot API; Telegram lỗi → 502.

Phía trang: `contact.html` (biến `endpoint` và ô ẩn `website`).

## Hạn chế đã biết

- Không giới hạn tần suất gửi. Kiểm tra `Origin` chỉ chặn trình duyệt; script bên ngoài có thể giả header và gửi spam vào Telegram.
- Không lưu bản ghi liên hệ; nếu Telegram lỗi, thông tin không được giữ lại.

## Nếu cần deploy từ repo

Chỉ làm khi chủ website yêu cầu. Sao chép `wrangler.jsonc.example` thành `wrangler.jsonc` (đã gitignore), rồi chạy từ thư mục này:

```sh
npx wrangler deploy
```

Deploy từ repo sẽ thay bản đang chạy. Secret hiện có được giữ nguyên; chỉ đặt lại bằng `npx wrangler secret put TELEGRAM_BOT_TOKEN` khi thật sự cần thay. Sau deploy, gửi thử một form thật và xác nhận tin nhắn đến Telegram.
