# GitHub에서 패키지로 사용하기

## 방법 1: pnpm workspace 사용 (권장) ⭐

### 1. localeEditor 프로젝트 빌드

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/localeEditor
pnpm build
```

### 2. frontend 프로젝트에 workspace 설정

`/Users/miso/Desktop/Development/LocalizeKit/frontend/pnpm-workspace.yaml` 파일 생성:

```yaml
packages:
  - '../localeEditor'
```

### 3. frontend 프로젝트의 package.json에 추가

```json
{
  "dependencies": {
    "localeeditor": "workspace:*"
  }
}
```

### 4. 설치

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/frontend
pnpm install
```

## 방법 2: GitHub URL로 직접 설치

### 1. localeEditor 프로젝트 빌드 및 커밋

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/localeEditor
pnpm build
git add dist
git commit -m "Add dist folder for package distribution"
git push
```

### 2. frontend 프로젝트에서 설치

`frontend/package.json`:

```json
{
  "dependencies": {
    "localeeditor": "github:YOUR_USERNAME/localeEditor#main"
  }
}
```

또는 명령어로:

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/frontend
pnpm add localeeditor@github:YOUR_USERNAME/localeEditor#main
```

**주의**: GitHub URL로 설치하려면 `dist` 폴더가 GitHub에 포함되어 있어야 합니다.

## 방법 3: 로컬 경로로 설치 (개발용)

`frontend/package.json`:

```json
{
  "dependencies": {
    "localeeditor": "file:../localeEditor"
  }
}
```

## 사용 예제

```typescript
import { VirtualTableDiv } from 'localeeditor';
import 'localeeditor/dist/index.css'; // 스타일 import 필수!

const container = document.getElementById('editor')!;

const editor = new VirtualTableDiv({
  container,
  translations: [
    {
      id: '1',
      key: 'common.buttons.submit',
      values: { en: 'Submit', ko: '제출' },
      context: 'Submit button text',
    },
  ],
  languages: ['en', 'ko'],
  defaultLanguage: 'en',
});
```

## 필요한 의존성

`frontend` 프로젝트에 다음 의존성이 필요합니다:

```json
{
  "dependencies": {
    "effect": "^3.19.13",
    "zod": "^4.2.1",
    "@tailwindcss/vite": "^4.1.18",
    "tailwindcss": "^4.1.18"
  }
}
```

## 권장 방법

**pnpm workspace 사용을 권장합니다** (방법 1):
- ✅ 로컬 개발 시 즉시 반영
- ✅ 버전 관리 용이
- ✅ 빌드 파일을 git에 포함할 필요 없음
- ✅ 가장 깔끔한 방법

