# Design System Rules — Mini Social App

File này là rule bắt buộc khi tạo hoặc sửa UI cho đồ án mạng xã hội thu nhỏ. Trước khi làm UI mới trong `frontend/` hoặc `frontend-web/`, agent phải đọc file này và bám theo token/component contract bên dưới.

## 1. Luật bắt buộc

- Không hardcode màu mới nếu màu đó có thể là token.
- Không tạo lại style card/button/input/avatar local nếu đã có hoặc nên có primitive dùng chung.
- Không dùng song song nhiều màu xanh brand. Accent chính của app là `#4A9FD8`.
- Không dùng `#1877F2` cho UI mới trừ khi đang sửa màn hình cũ và có lý do tương thích rõ ràng.
- Không thêm radius tùy hứng như `20`, `22`, `28`, `30` nếu không có lý do visual cụ thể.
- UI mới phải pass checklist ở cuối file trước khi kết thúc task.

## 2. Core tokens

Ưu tiên đưa các giá trị này vào theme/shared constants thay vì lặp lại trong từng component.

```css
:root {
  --app-bg: #F8FAFC;
  --surface: #FFFFFF;
  --surface-muted: #F1F5F9;
  --text: #0F172A;
  --text-muted: #64748B;
  --border: #E4E8EE;
  --border-soft: rgba(148, 163, 184, 0.28);
  --accent: #4A9FD8;
  --accent-hover: #2F8BC9;
  --accent-soft: rgba(74, 159, 216, 0.12);
  --success: #16A34A;
  --warning: #F59E0B;
  --danger: #EF4444;
}
```

### Token roles

| Token | Dùng cho | Không dùng cho |
| --- | --- | --- |
| `--app-bg` | nền app/page | card chính |
| `--surface` | card, modal, sheet | nền toàn màn hình |
| `--surface-muted` | empty state, subtle panel | CTA chính |
| `--text` | heading/body chính | disabled text |
| `--text-muted` | metadata, timestamp, helper text | paragraph chính dài |
| `--border` | card/input divider | focus active |
| `--accent` | primary action, active tab, selected state, focus | mọi icon/action phụ |
| `--accent-soft` | selected background, avatar fallback, active pill | background lớn toàn trang |

## 3. Typography contract

Giữ tối đa 5 role để UI nhìn đồng nhất.

| Role | Web gợi ý | Mobile gợi ý | Dùng cho |
| --- | --- | --- | --- |
| Page title | 28–32px / 700 | 26–30px / 700 | profile name, page heading |
| Section title | 20–22px / 700 | 19–21px / 700 | block heading |
| Body | 15–16px / 400–500 | 15–16px / 400–500 | post text, form text |
| Caption | 13–14px / 400 | 13–14px / 400 | timestamp, helper text |
| Label | 11–12px / 700 | 11–12px / 700 | uppercase label, tab metadata |

Rules:

- Không thêm size custom chỉ để “nhìn vừa mắt” nếu 5 role trên đã đủ.
- ALL CAPS phải có tracking/letter spacing rõ ràng.
- Body text dài không dùng màu quá nhạt; dùng `--text` hoặc màu gần `#334155`.
- Metadata/timestamp dùng `--text-muted`.

## 4. Radius scale

Chỉ dùng 4 cấp chính:

| Radius | Dùng cho |
| --- | --- |
| `32` | feed card lớn, modal/sheet lớn |
| `24` | card nhỏ, list row, panel phụ |
| `18` | button, input, search field, action chip |
| `14` | icon button nhỏ, media thumbnail nhỏ, compact surface |

Rules:

- Avatar vẫn dùng circle/pill radius đầy đủ.
- Media lớn có thể theo parent card, nhưng không tạo cấp radius mới nếu không cần.
- Nếu thấy cần dùng `28`, `30`, `22`, `20`, hãy đổi về cấp gần nhất trước.

## 5. Shadow và depth

- Mặc định không dùng shadow.
- Chỉ dùng soft shadow cho feed card chính hoặc modal/sheet nổi.
- Không stack nhiều shadow.
- Depth ưu tiên bằng background + border: `surface`, `surface-muted`, `border`.

Gợi ý shadow duy nhất nếu cần:

```css
box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
```

## 6. Component primitives bắt buộc

Nếu UI mới cần các pattern dưới đây, ưu tiên tạo/dùng primitive chung thay vì viết lại class/style local.

### Surface / Card

Variants:

- `default`: surface + border + radius 24/32.
- `elevated`: surface + border + soft shadow; chỉ dùng cho feed card/modal.
- `interactive`: default + hover/pressed state nhẹ.

Contract:

- Background: `surface`.
- Border: `border` hoặc `border-soft`.
- Radius: chỉ dùng scale 32/24/18/14.
- Không tự đổi accent border cho card thường.

### Button

Variants:

- `primary`: accent background, text trắng.
- `secondary`: surface-muted hoặc border button.
- `ghost`: transparent, text muted/text.
- `danger`: danger token cho destructive action.

Sizes:

- `sm`: 32px height.
- `md`: 40–44px height.
- `lg`: 48px height.

Rules:

- Mobile touch target tối thiểu 44px.
- Mỗi screen chỉ nên có 1 primary CTA chính.
- Button phải có `disabled` và `loading` state nếu gọi async.

### Input / Search / Textarea

Contract:

- Radius: 18.
- Border: `border`.
- Focus: `accent` hoặc `accent-soft`.
- Placeholder/helper: `text-muted`.
- Error message nằm ngay dưới field, không dùng alert rời nếu lỗi thuộc field.

### Avatar

Sizes:

- `sm`: 32px.
- `md`: 40–44px.
- `lg`: 56–64px.
- `xl`: 88–112px.

Contract:

- Có image fallback bằng initials.
- Fallback background dùng `accent-soft`, text dùng `accent`.
- Không làm layout nhảy khi ảnh lỗi/chưa tải.
- Có alt/accessibility label phù hợp.

### Badge / Pill

Variants:

- `accent`, `success`, `warning`, `danger`.

Rules:

- Chỉ dùng badge cho trạng thái thật hoặc metadata quan trọng.
- Không biến mọi metadata thành badge.

## 7. UX states nhất quán

- Like/comment/share giữ cùng size, spacing, active state trên mọi post.
- Loading dùng skeleton hoặc disabled state nhất quán; không để button/input nhảy layout.
- Empty state: title 20–22, body 14–16, optional action 44px.
- Error state: message rõ việc, action hồi phục nếu có.
- Form validation nằm dưới field liên quan.
- Focus state phải thấy rõ bằng accent/border, không chỉ đổi màu chữ.

## 8. Responsive / mobile rules

- Touch target tối thiểu 44px cho action trên mobile.
- Feed card mobile nên giữ single column, không ép layout 2 cột.
- Desktop có thể tăng content width, nhưng body/post text không quá dài gây khó đọc.
- Không dùng hover-only interaction cho hành động quan trọng.
- Nếu web và mobile cùng một screen concept, giữ cùng token/radius/component naming.

## 9. Checklist trước khi hoàn thành UI mới

- [ ] Đã đọc `DESIGN_SYSTEM_RULES.md` trước khi sửa/tạo UI.
- [ ] Accent chính vẫn là `#4A9FD8`.
- [ ] Không thêm hardcoded hex mới nếu có thể dùng token.
- [ ] Card mới dùng Surface/Card contract.
- [ ] Button/Input/Avatar dùng primitive chung hoặc task có lý do rõ nếu chưa tách được.
- [ ] Radius chỉ dùng 32 / 24 / 18 / 14, trừ avatar circle/pill.
- [ ] Typography nằm trong 5 role.
- [ ] Loading/empty/error state nhất quán với rule trên.
- [ ] Mobile action target tối thiểu 44px.
- [ ] Nếu sửa frontend-web, chạy `npm run lint` và `npm run build` trong `frontend-web/`.
- [ ] Nếu sửa frontend Expo, chạy `npm run lint` trong `frontend/`.
