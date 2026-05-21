INSERT INTO users (
  email,
  password_hash,
  first_name,
  last_name,
  gender,
  city,
  role,
  is_active,
  is_deleted,
  created_at,
  updated_at
)
SELECT
  format('fake.user.%s@example.com', lpad(series::text, 4, '0')) AS email,
  '100000$EREREREREREREREREREREQ==$S1FrxbcPxZFTSZtgr7NfdBUsLfqeMipXALuywI4KBiA=' AS password_hash,
  'Fake' AS first_name,
  format('User %s', series) AS last_name,
  CASE
    WHEN series % 3 = 0 THEN 'female'
    WHEN series % 3 = 1 THEN 'male'
    ELSE 'custom'
  END AS gender,
  CASE
    WHEN series % 5 = 0 THEN 'Ha Noi'
    WHEN series % 5 = 1 THEN 'Ho Chi Minh'
    WHEN series % 5 = 2 THEN 'Da Nang'
    WHEN series % 5 = 3 THEN 'Can Tho'
    ELSE 'Hai Phong'
  END AS city,
  'user' AS role,
  true AS is_active,
  false AS is_deleted,
  now() AS created_at,
  now() AS updated_at
FROM generate_series(1, 1000) AS series
ON CONFLICT (email) DO NOTHING;
