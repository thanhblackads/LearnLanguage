# Game Tập Gõ & Phát Âm Tiếng Anh

Ứng dụng web học từ vựng tiếng Anh tương tác, giúp người dùng thực hành gõ và phát âm đúng các từ tiếng Anh.

## Tính năng

- **Luyện gõ từ**: Người dùng nhìn từ tiếng Anh và gõ lại
- **Luyện phát âm**: Nghe phát âm mẫu và thực hành phát âm lại
- **Kiểm tra phát âm**: Tự động nhận diện và đánh giá phát âm của người dùng
- **Từ điển tùy chỉnh**: Dễ dàng mở rộng từ điển với nhiều cấp độ khác nhau
- **Tích hợp TTS & STT**: Sử dụng Web Speech API cho phát âm và nhận diện giọng nói
- **PWA**: Có thể cài đặt và sử dụng offline

## Yêu cầu hệ thống

- Trình duyệt hiện đại hỗ trợ Web Speech API (Google Chrome, Microsoft Edge, Safari)
- Kết nối HTTPS để sử dụng đầy đủ tính năng STT
- Micro (cho tính năng nhận diện phát âm)
- Loa/tai nghe (cho tính năng nghe phát âm)

## Cài đặt

1. Tải về tất cả các file trong repository
2. Đặt các file vào một thư mục web server
3. Truy cập trang web qua HTTPS để sử dụng đầy đủ tính năng

## Cấu trúc file

- `index.html` - Giao diện người dùng
- `styles.css` - CSS tạo kiểu cho ứng dụng
- `script.js` - Mã JavaScript xử lý logic ứng dụng
- `dictionary.json` - Dữ liệu từ điển Anh-Việt
- `service-worker.js` - Service worker cho tính năng PWA
- `manifest.json` - Manifest cho PWA
- `favicon.ico` và các icon - Biểu tượng ứng dụng

## Tùy chỉnh từ điển

Bạn có thể dễ dàng thêm từ mới vào từ điển bằng cách chỉnh sửa file `dictionary.json`. Mỗi mục từ có định dạng:

```json
{ "en": "từ_tiếng_anh", "vi": "nghĩa_tiếng_việt" }
```

## Tùy chọn giọng đọc

Ứng dụng cho phép người dùng chọn giọng đọc tiếng Anh khác nhau từ các giọng có sẵn trong hệ thống của họ. Lựa chọn được lưu trong trình duyệt của người dùng.

## Giấy phép

Dự án được cấp phép theo [MIT License](LICENSE).

## Liên hệ

Nếu bạn có bất kỳ câu hỏi hoặc đề xuất nào, vui lòng liên hệ:

- Email: your.email@example.com
- Website: https://yourwebsite.com
