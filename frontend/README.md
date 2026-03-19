# Frontend

Frontend duoc xay dung bang Expo, React Native, Expo Router, TypeScript va NativeWind.

## Stack chinh

- Expo SDK 54
- React 19
- React Native 0.81
- Expo Router 6
- TypeScript strict
- NativeWind 4
- ESLint qua `eslint-config-expo`

## Cai dat

Tu thu muc `frontend/`:

```bash
npm install
cp .env.example .env.local
```

Mac dinh `EXPO_PUBLIC_API_URL` trong `frontend/.env.example` dang tro toi `http://localhost:8000`.
Neu test Android emulator, thuong can doi thanh `http://10.0.2.2:8000`.
Neu mo Expo Go tren dien thoai that va khong set bien env nay, app se tu co gang suy ra IP LAN cua may dev de goi backend `:8000`.

## Chay ung dung

Tu thu muc `frontend/`:

```bash
npm run start
```

Cac lenh khac:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## Cau truc thu muc

```text
frontend/
|- app/                  # Route va screen theo Expo Router
|  |- _layout.tsx        # Stack layout goc, import global.css
|  |- modal.tsx          # Modal preview
|  '- (tabs)/            # Nhom route dang tab
|     |- _layout.tsx     # Cau hinh tab navigator
|     |- index.tsx       # Home feed demo
|     '- explore.tsx     # Man hinh ghi chu kien truc
|- assets/               # Anh, icon, splash
|- components/           # Shared UI components
|- scripts/              # Script ho tro du an
|- babel.config.js       # Cau hinh Babel cho NativeWind
|- global.css            # Tailwind directives
|- metro.config.js       # Metro config cho NativeWind
|- nativewind-env.d.ts   # Type definitions cho className
|- tailwind.config.js    # Tailwind/NativeWind config
|- app.json              # Cau hinh Expo
|- package.json          # Scripts va dependencies
|- tsconfig.json         # Cau hinh TypeScript
'- eslint.config.js      # Cau hinh ESLint
```

## Styling

- Du an dang dung NativeWind cho phan lon layout, spacing, typography va surface UI.
- Styling duoc viet bang `className` utility-first tren React Native component.
- Van co the dung `StyleSheet.create` hoac style object cho animation, transform, absolute positioning, va cac truong hop dynamic.
- Khong con su dung he theme `light/dark` rieng cua project.

## Quy uoc code

- Route moi dat trong `app/` theo file-based routing.
- Shared component dat trong `components/`.
- Import noi bo uu tien alias `@/*`.
- Truoc khi ket thuc thay doi, chay:

```bash
npm run lint
```

## Ghi chu

- `app/_layout.tsx` import `../global.css` de NativeWind hoat dong.
- `metro.config.js` dang dung `withNativeWind(...)` voi input la `./global.css`.
- Frontend doc URL backend tu `EXPO_PUBLIC_API_URL` va co helper request trong `lib/api.ts`.
- Thu tu resolve URL backend: `EXPO_PUBLIC_API_URL` -> auto detect IP LAN tu Expo host (native) -> fallback `http://localhost:8000`.
- Neu them component moi, uu tien dung `className` truoc, chi quay lai `StyleSheet` khi utility class khong con phu hop.
