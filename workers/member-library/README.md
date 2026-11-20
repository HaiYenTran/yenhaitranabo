# Member library Worker

Backend cho khu vực thành viên của `yenhaitran.com`.

## Nguyên tắc bảo mật

- Worker xác thực tài khoản bằng PBKDF2-SHA-256 (100.000 vòng, giới hạn Web Crypto của Worker); không lưu mật khẩu thô.
- Phiên đăng nhập dùng token ngẫu nhiên, chỉ lưu SHA-256 của token trong D1 và gửi cookie `HttpOnly; Secure; SameSite=Strict`.
- Tài khoản tạm khóa 15 phút sau 5 lần nhập sai liên tiếp.
- Worker chạy trên route `yenhaitran.com/member-api/*` và hai route chuyển hướng `yenhaitran.com/about.html`, `yenhaitran.com/hanh-trinh-song-khoe-chu-dong.html` (301 sang `/yen_journey.html`); `workers.dev` bị tắt.
- D1 lưu thành viên, quyền, metadata tài liệu và nhật ký truy cập.
- R2 bucket để private; chỉ Worker có binding mới đọc/ghi file.
- Không commit token, Account ID, Access AUD hoặc file thành viên.
- Hai tài khoản test đăng nhập qua backend thật nhưng không có quyền mở file khi R2 chưa được bật.
- Tài liệu nội bộ không được đặt trong GitHub. Chỉ commit metadata; tệp HTML/PDF/Markdown thật phải được tải lên R2 private qua trang quản trị sau khi Access đã xác thực owner/admin.

## Trạng thái production (đọc qua API chỉ đọc ngày 20/11/2026)

- Worker `yen-tran-member-library` đã deploy, lần cuối 05/10/2026. Mã đang chạy khớp logic với `src/index.js` (so sau khi đóng gói bằng esbuild).
- Ba route ở trên đều trỏ vào Worker này và phản hồi đúng trên web thật.
- Binding: `DB` → D1 `yen-tran-members` (production, 5 bảng; chưa truy vấn dữ liệu) và, từ 20/11/2026, `MEMBER_FILES` → R2 `yen-tran-member-files`.
- R2 bật ngày 20/11/2026. Bucket `yen-tran-member-files`: lớp Standard, vị trí APAC, **private** (r2.dev tắt, không có custom domain), ban đầu rỗng.
- Binding R2 được thêm bằng API cập nhật settings của Worker, không tải lại mã: mã đang chạy giống hệt bản trước (05/10/2026), 3 route giữ nguyên. Kiểm tra sau thay đổi: `/member-api/session` và `/member-api/documents` trả 401 khi chưa đăng nhập, hai trang cũ vẫn 301.
- Bước tiếp theo: owner đăng nhập `members-admin.html` để tải tài liệu lên R2. Không đặt tài liệu nội bộ trong GitHub.

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
