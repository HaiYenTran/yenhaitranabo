# Member library Worker

Backend cho khu vực thành viên của `yenhaitran.com`.

## Nguyên tắc bảo mật

- Worker xác thực tài khoản bằng PBKDF2-SHA-256 (100.000 vòng, giới hạn Web Crypto của Worker); không lưu mật khẩu thô.
- Phiên đăng nhập dùng token ngẫu nhiên, chỉ lưu SHA-256 của token trong D1 và gửi cookie `HttpOnly; Secure; SameSite=Strict`.
- Tài khoản tạm khóa 15 phút sau 5 lần nhập sai liên tiếp.
- Worker chỉ chạy trên route `yenhaitran.com/member-api/*`; `workers.dev` bị tắt.
- D1 lưu thành viên, quyền, metadata tài liệu và nhật ký truy cập.
- R2 bucket để private; chỉ Worker có binding mới đọc/ghi file.
- Không commit token, Account ID, Access AUD hoặc file thành viên.
- Hai tài khoản test đăng nhập qua backend thật nhưng không có quyền mở file khi R2 chưa được bật.
- Tài liệu nội bộ không được đặt trong GitHub. Chỉ commit metadata; tệp HTML/PDF/Markdown thật phải được tải lên R2 private qua trang quản trị sau khi Access đã xác thực owner/admin.

## Kích hoạt

1. Tạo D1 database `yen-tran-members`.
2. Tạo R2 bucket private `yen-tran-member-files`.
3. Sao chép `wrangler.jsonc.example` thành `wrangler.jsonc`, điền D1 database ID.
4. Chạy migration lên D1.
5. Thêm tài khoản chủ sở hữu trực tiếp vào D1:

```sql
INSERT INTO members (email, display_name, role, active)
VALUES ('OWNER_EMAIL', 'Yến Trần', 'owner', 1);
```

6. Tạo salt và hash PBKDF2 riêng cho từng tài khoản; chỉ ghi hash/salt vào D1.
7. Deploy Worker trên route `yenhaitran.com/member-api/*`.
8. Trang HTML công khai chỉ là vỏ giao diện; API, metadata động và nội dung tài liệu yêu cầu cookie phiên hợp lệ.

Không đưa `wrangler.jsonc` thật vào GitHub. Tệp này đã được `.gitignore` loại trừ.
