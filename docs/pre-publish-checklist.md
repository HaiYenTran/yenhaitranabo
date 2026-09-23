# Kiểm tra trước khi đăng website

## Tự động

Chạy tại thư mục gốc:

```bash
node scripts/prepublish-qa.js
```

Lệnh phải kết thúc với `Lỗi: 0`. GitHub Actions cũng chạy cùng kiểm tra trước mỗi lần cập nhật `main`.

Kiểm tra tự động gồm URL và ảnh nội bộ, `alt`, viewport mobile, ID trùng, popup có nút đóng, `target="_blank"`, contrast của hệ màu chính và các mẫu token/mật khẩu không được phép commit.

## Trực quan bắt buộc

Kiểm tra các trang vừa sửa ở ba độ rộng:

- Mobile: 360 × 800 px.
- Tablet: 768 × 1024 px.
- Desktop: 1440 × 900 px.

Ở mỗi kích thước, xác nhận không có cuộn ngang, ảnh không méo hoặc tràn, chữ không bị cắt, CTA cuối trang chỉ có một bước tiếp theo rõ ràng và popup nằm trọn trong màn hình.

## Bàn phím và popup

- Dùng `Tab` từ đầu đến cuối trang; focus phải luôn nhìn thấy.
- Dùng `Enter` hoặc `Space` mở được nút.
- Popup phải có nút `×`, đóng được bằng `Escape`, không để focus thoát ra nền và trả focus về nút đã mở popup.
- Menu mobile phải có trạng thái mở/đóng được thông báo bằng `aria-expanded`.

## Nội dung và bảo mật

- Mỗi trang kết thúc bằng đúng một bước tiếp theo phù hợp với hành trình: đọc → dùng công cụ → gửi kết quả/đăng ký → Yến phản hồi.
- Không đưa token Telegram, khóa API, private key hoặc mật khẩu dạng rõ vào HTML/JavaScript.
- Secret của Cloudflare Worker chỉ lưu trong Cloudflare `Secrets`, không lưu trong GitHub.
- Website tĩnh không thể bảo vệ tuyệt đối file PDF công khai. Nếu cần kiểm soát quyền thật, PDF phải chuyển khỏi GitHub Pages và được phục vụ qua Worker có xác thực phía máy chủ.
