# LocaleEditor 패키지 사용 가이드

## GitHub에서 패키지로 사용하기

### 방법 1: pnpm workspace 사용 (권장)

`frontend` 프로젝트의 `package.json`에 다음을 추가:

```json
{
  "pnpm": {
    "overrides": {
      "localeeditor": "workspace:*"
    }
  }
}
```

그리고 `frontend/pnpm-workspace.yaml` 파일 생성:

```yaml
packages:
  - '../localeEditor'
```

그 다음 `frontend` 프로젝트에서:

```bash
pnpm add localeeditor
```

### 방법 2: GitHub URL로 직접 설치

`frontend` 프로젝트의 `package.json`에 직접 추가:

```json
{
  "dependencies": {
    "localeeditor": "github:YOUR_USERNAME/localeEditor#main"
  }
}
```

또는 pnpm/yarn 사용:

```bash
# pnpm
pnpm add localeeditor@github:YOUR_USERNAME/localeEditor#main

# yarn
yarn add localeeditor@github:YOUR_USERNAME/localeEditor#main

# npm
npm install github:YOUR_USERNAME/localeEditor#main
```

**주의**: 이 방법을 사용하려면 `dist` 폴더를 GitHub에 포함시켜야 합니다.

### 방법 3: 로컬 경로로 설치 (개발용)

`frontend` 프로젝트의 `package.json`:

```json
{
  "dependencies": {
    "localeeditor": "file:../localeEditor"
  }
}
```

## 사용 방법

### 1. 패키지 설치

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/frontend
pnpm add localeeditor
```

### 2. 코드에서 사용

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

### 3. 필요한 의존성

`frontend` 프로젝트에 다음 의존성이 필요합니다:

```json
{
  "dependencies": {
    "effect": "^3.19.13",
    "zod": "^4.2.1",
    "tailwindcss": "^4.1.18"
  }
}
```

## 빌드

패키지를 사용하기 전에 `localeEditor` 프로젝트를 빌드해야 합니다:

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/localeEditor
pnpm build
```

이렇게 하면 `dist` 폴더에 빌드된 파일이 생성됩니다.

