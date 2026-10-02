INSERT INTO documents (
  title,
  description,
  category,
  source_label,
  access_level,
  created_by
)
SELECT
  'ASSP Dream Buyer Avatar — Cô Rùa Công Sở',
  'Chân dung khách hàng, nỗi đau, ước muốn, phản đối và định hướng nội dung nội bộ.',
  'amway-present-value',
  'Tài liệu chiến lược nội bộ do Yến cung cấp',
  'member',
  'initial-setup'
WHERE NOT EXISTS (
  SELECT 1 FROM documents
  WHERE title = 'ASSP Dream Buyer Avatar — Cô Rùa Công Sở'
);
