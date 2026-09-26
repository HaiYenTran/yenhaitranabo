# Member library Worker

Backend cho khu vực thành viên của `yenhaitran.com`.

## Nguyên tắc bảo mật

- Cloudflare Access/OTP xác thực danh tính; Worker không lưu mật khẩu.
- Worker chỉ chạy trên route `yenhaitran.com/member-api/*`; `workers.dev` bị tắt.
- D1 lưu thành viên, quyền, metadata tài liệu và nhật ký truy cập.
- R2 bucket để private; chỉ Worker có binding mới đọc/ghi file.
- Không commit token, Account ID, Access AUD hoặc file thành viên.

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

6. Deploy Worker và bật Cloudflare Access cho route Worker.
7. Access policy cho phép OTP; Worker tiếp tục kiểm tra email có trong D1.
8. Bảo vệ thêm `yenhaitran.com/members.html` và `yenhaitran.com/members-admin.html` bằng Access.

Không đưa `wrangler.jsonc` thật vào GitHub. Tệp này đã được `.gitignore` loại trừ.
