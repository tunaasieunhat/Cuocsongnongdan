// Cấu hình chơi online (GĐ10) — dùng Supabase (gói miễn phí đủ cho game nhỏ).
// Để trống = game chạy offline như bình thường, nút "Tài khoản & bạn bè" sẽ hiện hướng dẫn.
//
// Cách bật: xem docs/ONLINE.md. Tóm tắt:
//   1. Tạo project tại supabase.com (miễn phí).
//   2. Mở SQL Editor, chạy toàn bộ file supabase/schema.sql.
//   3. Vào Project Settings > API, chép "Project URL" và khoá "anon public" vào 2 dòng dưới.
// Khoá "anon" được phép công khai (dữ liệu đã được bảo vệ bằng Row Level Security trong schema.sql).
// TUYỆT ĐỐI không dán khoá "service_role" vào đây.

export const ONLINE = {
  supabaseUrl: '', // ví dụ: 'https://abcdxyz.supabase.co'
  supabaseAnonKey: '', // khoá anon public
  cloudSaveEvery: 30, // giây giữa 2 lần lưu lên mạng
};
