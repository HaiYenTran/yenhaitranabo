# Bàn giao website yenhaitran.com

Ngày lập: 18/11/2026; cập nhật 20/11/2026 với kết quả kiểm tra Cloudflare chỉ đọc (mục 2, 7, 8). Dành cho Claude Code hoặc người tiếp quản. Tài liệu này dựa trên mã nguồn đã đọc và kết quả triển khai trong phiên làm việc; không phải bản kiểm toán toàn bộ hạ tầng. Quy tắc làm việc tại `../CLAUDE.md`.

## 1. Repo và trạng thái bàn giao

- Chủ website: Yến Trần.
- Repo: https://github.com/HaiYenTran/yenhaitranabo
- Thư mục trên máy hiện tại: `/Users/yentran/Documents/Codex/yenhaitranabo`.
- Nhánh đang dùng: `main`; remote `origin` trỏ tới repo trên.
- Commit nội dung gần nhất trước khi lập tài liệu: `c8e186a` (thêm Naval). Trước đó: `05e7773` (bổ sung đọc online Khát vọng trăm năm), `d746b7f` (thêm trang giới thiệu).
- Trước khi tạo hai tài liệu bàn giao, working tree sạch. Hai tài liệu này được tạo theo yêu cầu bàn giao; không suy ra rằng chúng đã được commit/push. Kiểm tra `git status` và lịch sử thực tế.
- Mã nguồn và lịch sử Git không phụ thuộc Codex. Mở thư mục bằng Claude Code là tiếp tục được. Lịch sử trò chuyện, kỹ năng riêng và đăng nhập dịch vụ không tự đi theo repo.

## 2. Hạ tầng: điều đã biết và điều cần xác minh

| Thành phần | Bằng chứng/trạng thái | Cách tiếp quản |
|---|---|---|
| Website tĩnh / GitHub Pages | Workflow "pages build and deployment" chạy thành công trên `main` (commit d236d31); file CNAME chứa yenhaitran.com | Chưa xem trực tiếp Settings → Pages; kiểm tra trước khi thay luồng deploy |
| DNS (Cloudflare) | Zone `yenhaitran.com` active, gói Free, nameserver Cloudflare. 4 bản ghi A về IP GitHub Pages (185.199.108–111.153) và `www` CNAME `haiyentran.github.io`, tất cả bật proxy | Không đổi DNS để xử lý cache thông thường |
| SSL/TLS | Chế độ SSL `Full`. Ngày 20/11/2026 chủ website đã bật Always Use HTTPS và nâng TLS tối thiểu lên **1.2** (xác minh qua API); TLS 1.3 bật. Website vẫn phản hồi bình thường sau thay đổi | Không hạ TLS tối thiểu khi chưa có lý do cụ thể |
| Tên miền (nhà đăng ký) | Chưa xác định nhà đăng ký, ngày hết hạn, tự gia hạn. Không suy ra từ việc dùng DNS Cloudflare | Chủ tài khoản kiểm tra Domain Registration trên Cloudflare hoặc hóa đơn mua tên miền |
| CI | `.github/workflows/site-quality.yml` chạy Node 20 và prepublish QA trên PR/push main | Giữ kiểm tra này; nó không phải cấu hình triển khai Pages |
| Worker thành viên `yen-tran-member-library` | Đang chạy; 3 route trên yenhaitran.com; binding `DB`; workers.dev tắt; mã khớp repo. Chi tiết: `workers/member-library/README.md` | Deploy cần token quyền ghi; không deploy khi chưa được yêu cầu |
| D1 `yen-tran-members` | Production, 5 bảng, ~72 KB. Chưa truy vấn dữ liệu, chưa kiểm tra backup/Time Travel | Không chạy migration remote khi chưa có kế hoạch backup |
| R2 | **Chưa bật trên tài khoản**; bucket `yen-tran-member-files` chưa tồn tại. Chủ website muốn dùng nếu nằm trong gói miễn phí | Bật R2 trên Dashboard → tạo bucket private → deploy lại Worker thành viên có binding `MEMBER_FILES` |
| Worker form liên hệ `momoshare-contact` | Đang chạy qua `*.workers.dev`, gửi form `contact.html` sang Telegram; mã sao lưu tại `workers/momoshare-contact/` | Mã từng chỉ sửa trên Dashboard; so sánh bản chạy với repo trước khi sửa |
| Analytics | Cloudflare Web Analytics bật (tự cài beacon). Zaraz bật nhưng chỉ có 1 công cụ Custom HTML đặt `window.yenZarazReady=true`; **không có công cụ nào nhận sự kiện `zaraz.track()`** từ `js/yen-site-system.js` | Chọn đích nhận sự kiện (vd. GA4) hoặc chấp nhận chỉ dùng Web Analytics |
| Search Console | Repo có file xác minh `google736698dcc33cd215.html`; DNS không có bản ghi xác minh Google. Chưa biết tài khoản sở hữu | Chủ tài khoản Google kiểm tra |

Không cần chuyển host hoặc đổi nameserver để đổi công cụ AI. GitHub, Cloudflare và nhà đăng ký tên miền vẫn là các dịch vụ riêng của chủ website.

## 3. Bản đồ mã nguồn

- HTML ở gốc và `pages/`: website tĩnh, nhiều trang có CSS/JS nội tuyến; không có yêu cầu build frontend chung đã xác định cho việc sửa HTML.
- `pages/books/tu-sach.html`: danh mục sách.
- `pages/books/naval-ravikant.html`: mẫu sách mới hoàn chỉnh.
- `pages/books/khat-vong-tram-nam.html`: cuốn mới trước đó.
- `pages/books/hanh-trinh-ve-phuong-dong.html`: mẫu sổ tay lật trang người dùng yêu cầu làm theo.
- `pages/books/doc-sach.html`: danh mục slug → metadata/PDF/review và trình đọc PDF.js.
- `vendor/pdfjs/`: thư viện trình đọc dùng tại chỗ.
- `assets/docs/books/`, `assets/img/books/`: PDF công khai và ảnh sách.
- `css/yen-site-system.css`, `js/yen-site-system.js`: giao diện/hành vi dùng chung; đọc trước khi sửa header, CTA, form hoặc tracking.
- `js/access-gate.js`: kiểm tra cổng mật khẩu phía client. Không ghi lại giá trị mật khẩu hoặc digest vào tài liệu bàn giao.
- `members.html`, `members-login.html`, `members-admin.html`, `js/member-auth.js`, `js/member-portal.js`: giao diện khu vực thành viên.
- `workers/member-library/`: backend thành viên; đọc README và mã thực tế, vì hướng dẫn cũ có thể chưa bao quát các thay đổi mới.
- `workers/momoshare-contact/`: sao lưu nguyên văn Worker form liên hệ (Telegram) đang chạy; đọc README trước khi sửa hoặc deploy.
- `sitemap.xml`, `robots.txt`, `CNAME`: chỉ mục và tên miền.
- `docs/content-inventory.md`, `docs/content-inventory.csv`: kiểm kê nội dung; kiểm tra độ mới trước khi dùng làm nguồn chân lý.
- `docs/cloudflare-bulk-redirects.csv`: dữ liệu redirect; sự tồn tại file không chứng minh đã import vào Cloudflare.
- `docs/pre-publish-checklist.md`, `scripts/prepublish-qa.js`: kiểm tra trước xuất bản.
- `pages/README.md`: tổ chức nội dung và giữ URL cũ bằng redirect.

## 4. Chuẩn nội dung được chuyển từ kỹ năng riêng

Các quy tắc chính đã chép vào CLAUDE.md để Claude không cần truy cập `~/.codex/skills`. Cấu trúc nội dung: Trang chủ; Sống khỏe; Góc chủ động & câu chuyện; Khám phá (sách/sản phẩm số/sự kiện); Liên hệ. Chọn một nhóm chính cho mỗi trang.

Hành trình mong muốn: đọc nội dung → dùng công cụ/tài nguyên → gửi kết quả hoặc đăng ký tư vấn → Yến phản hồi. Chọn một CTA cuối phù hợp; với trang sách hiện tại là mở trình đọc. Không thêm nhiều lời mời cạnh tranh.

Các cụm từ khóa nền từ quy chuẩn đã có (cần đối chiếu trang và Search Console khi thay đổi):

| URL | Cụm chính / ý định |
|---|---|
| `/` | Yến Trần; giới thiệu và chọn nhóm nội dung |
| `/healthylifestyle.html` | sống khỏe chủ động |
| `/kiem-soat-can-nang.html` | kiểm soát cân nặng lành mạnh |
| `/pages/digital/bi-quyet-giam-can-lanh-manh.html` | bí quyết giảm cân lành mạnh |
| `/omega-3-hap-thu-epa-dha.html` | hấp thụ EPA DHA; omega-3 EPA DHA |
| `/pages/digital/digital_index.html` | sản phẩm số Yến Trần |
| `/pages/digital/banh-xe-cuoc-doi.html` | bài trắc nghiệm bánh xe cuộc đời online |
| `/khao-sat-co-hoi.html` | khảo sát định hướng cá nhân |
| `/pages/books/tu-sach.html` | tủ sách phát triển bản thân |
| `/pages/books/hanh-trinh-ve-phuong-dong.html` | review Hành trình về phương Đông |
| `/pages/books/khat-vong-tram-nam.html` | giới thiệu Khát vọng trăm năm |
| `/pages/books/naval-ravikant.html` | Naval Ravikant – Để thịnh vượng và hạnh phúc |
| `/events.html` | sự kiện Yến Trần |
| `/passiveincome.html` | sống chủ động; tạo thêm nguồn thu |
| `/pages/stories/nhung-cau-chuyen.html` | câu chuyện truyền cảm hứng thực tế |
| `/gioi-thieu-yen-tran.html` | Yến Trần là ai |
| `/contact.html` | tư vấn cùng Yến; tư vấn dinh dưỡng |

Hai dòng sách mới là định hướng nội dung từ trang đã tạo, chưa phải kết quả đo từ Search Console. Không tự xóa/đổi URL để xử lý trùng từ khóa mà thiếu kế hoạch redirect.

## 5. Trạng thái tủ sách và cách kiểm tra

Tại commit c8e186a: 21 cuốn. Khát vọng trăm năm có PDF 23 trang (~74 MB); Naval có PDF 272 trang (~1,1 MB), Eric Jorgenson biên soạn, Phương Anh dịch, Nhật Mỹ hiệu đính. Ảnh Naval là trang tên sách từ PDF, không phải bìa màu.

Đã kiểm thử trước xuất bản: sổ tay trước/sau và phím mũi tên, không tràn ngang ở 360 px, PDF tải được và chuyển trang; QA tĩnh 116 URL không có lỗi/cảnh báo. Đã xác nhận các trang mới và PDF phản hồi trên web. Đây là kết quả tại thời điểm thực hiện, không thay cho kiểm thử sau sửa.

Các tính năng trình đọc dùng chung gồm chuyển trang, phóng to/vừa trang, ghi nhớ vị trí và cổng mật khẩu. Không khẳng định mọi chức năng đều đã được kiểm thử trong lần thêm sách gần nhất.

Lưu ý quan trọng: PDF đặt trong repo công khai có thể mở bằng URL trực tiếp. Cổng JavaScript/sessionStorage là lời nhắc truy cập, không phải bảo vệ tài liệu riêng. Tài liệu nội bộ phải dùng backend/R2 private phù hợp. Số trang PDF có thể khác số trang in.

## 6. Phát triển, QA và xuất bản website tĩnh

Từ gốc repo:

```sh
git status --short
git diff
node scripts/prepublish-qa.js
python3 -m http.server 8000
```

Lệnh server dùng để xem local nếu môi trường cho phép. Mở localhost:8000; các đường dẫn tuyệt đối `/css`, `/js`, `/vendor` cần phục vụ từ gốc repo. Kiểm tra desktop và 360 px bằng trình duyệt. QA tĩnh không kiểm tra đầy đủ PDF được khai báo trong JavaScript, dịch vụ ngoài hay trải nghiệm giao diện.

Khi người dùng đã cho phép xuất bản:

1. Kiểm tra branch, remote và thay đổi từ xa; nếu phân kỳ thì xử lý dựa trên diff, không force-push.
2. Stage đúng file, commit có mô tả, push `origin main` theo cấu hình hiện tại.
3. Xem Actions và Pages. Có thể kiểm tra bằng GitHub CLI:

```sh
gh api repos/HaiYenTran/yenhaitranabo/pages/builds/latest --jq '{status: .status, commit: .commit}'
```

4. Đợi build hoàn tất, kiểm tra URL HTML, asset/PDF và thao tác trên web. Nếu CDN còn bản cũ, thử URL có query kiểm tra; không đổi DNS để xử lý cache thông thường.
5. Chỉ báo “đã lên web” sau khi nội dung mới được xác minh. Nếu chỉ push xong, nói rõ đang triển khai.

Khôi phục website tĩnh: xác định commit gây lỗi, xem diff và dùng commit đảo ngược (`git revert <commit>`) khi phù hợp và được phép; chạy QA rồi push. Không dùng reset hard/force-push làm cách khôi phục mặc định. Git revert không khôi phục dữ liệu D1/R2 hoặc DNS.

## 7. Backend thành viên và quyền quản trị

Đọc `workers/member-library/README.md`, `src/index.js`, `migrations/` và `wrangler.jsonc.example`. Cấu hình mẫu có Worker `yen-tran-member-library`, binding `DB` và `MEMBER_FILES`, route `/member-api/*` cùng các route cụ thể `/about.html`, `/hanh-trinh-song-khoe-chu-dong.html`. Xác minh cấu hình thực tế trước khi sửa; deploy Worker có thể ảnh hưởng các URL này.

Trạng thái đã đọc qua API ngày 20/11/2026: Worker đang chạy với đúng ba route trên và binding `DB`; R2 chưa bật nên chưa có `MEMBER_FILES` (xem `workers/member-library/README.md`).

Mã hiện có xử lý login/logout/session, danh sách/nội dung tài liệu và API quản trị thành viên/tài liệu. Có cơ chế xác thực backend, session và lưu tài liệu R2; không suy ra tài khoản hoặc file production đã được provision từ mã nguồn.

Các script được khai báo trong package của Worker:

- `npm run dev`: wrangler dev.
- `npm run deploy`: wrangler deploy.
- `npm run db:local`: áp dụng migration local.
- `npm run db:remote`: áp dụng migration remote.

Đây là mô tả lệnh, không phải yêu cầu chạy. Trước deploy phải xác minh account/zone, cấu hình thật, binding, secrets, phạm vi route và quyền. Trước migration remote cần xác định dữ liệu bị ảnh hưởng và phương án backup/khôi phục. Deploy GitHub Pages không tự deploy Worker.

`workers/member-library/wrangler.jsonc`, `.wrangler/`, `.env*` được gitignore. Không in nội dung bí mật ra màn hình hoặc sao chép nguyên file vào repo. Khi clone trên máy khác, cấu hình bỏ qua Git cần được thiết lập riêng bằng thông tin từ chủ tài khoản.

## 8. Tài khoản, bàn giao và việc còn cần xác minh

Claude cần quyền GitHub để push/xem Pages; quyền Cloudflare để quản lý Worker, DNS, D1, R2; quyền nhà đăng ký tên miền cho gia hạn nếu khác Cloudflare. Dùng đăng nhập chính thức hoặc quyền tối thiểu phù hợp; không chuyển token qua file Markdown. Quyền từng có ở Codex không bảo đảm Claude đã có trong môi trường mới.

Quyền hiện có (20/11/2026): một API token Cloudflare **chỉ đọc** do chủ website tạo, lưu dưới dạng network secret của môi trường Claude Code (không nằm trong repo hay hội thoại). Quyền gồm đọc zone/DNS/Workers Routes/Zone Settings của `yenhaitran.com` và đọc Workers Scripts/D1/Account Settings. Không có quyền ghi, Registrar hay R2. Khi cần thay đổi, chủ website cấp tạm quyền Edit tương ứng rồi gỡ lại sau khi xong.

Đã xác minh ngày 20/11/2026: không có cron trên hai Worker; Email Routing của zone chưa cấu hình.

Chưa xác minh:

- Nhà đăng ký, ngày hết hạn và chế độ tự gia hạn tên miền.
- Redirect/Bulk Redirects, cache, WAF/Access rules (chưa có quyền đọc); `docs/cloudflare-bulk-redirects.csv` chưa được đối chiếu với Cloudflare.
- Dữ liệu và trạng thái backup/Time Travel của D1.
- Tài khoản sở hữu Search Console; bot Telegram ngoài Worker form.
- Automation ngoài Cloudflare (Zapier, Make, Apps Script…); không thấy không có nghĩa là không có.

Hạn chế cần biết: PDF Khát vọng trăm năm lớn và từng được GitHub cảnh báo vượt mức kích thước khuyến nghị 50 MB (push vẫn thành công). Có thể tối ưu có chủ đích sau này, phải giữ khả năng đọc và kiểm tra chất lượng; không tự thay file gốc chỉ để giảm dung lượng.

Trình tự tiếp quản đề nghị: đọc hai tài liệu → kiểm tra git và QA → mở website local → xác minh tài khoản cần cho công việc → thực hiện yêu cầu tiếp theo. Không cần tạo lại repo, chuyển hosting hoặc thay tên miền.
