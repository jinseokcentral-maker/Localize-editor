# LocaleEditor 사용 가이드

## frontend 프로젝트에서 사용하기

### 방법 1: pnpm workspace 사용 (로컬 개발용, 권장) ⭐

이미 설정이 완료되었습니다!

#### 1. localeEditor 빌드

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/localeEditor
pnpm package  # 또는 pnpm build
```

#### 2. frontend에서 설치

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/frontend
pnpm install
```

#### 3. 사용하기

```typescript
// frontend 프로젝트에서
import { VirtualTableDiv } from "localeeditor";
import "localeeditor/styles"; // 또는 "localeeditor/dist/index.css"

// React 컴포넌트에서 사용
function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = new VirtualTableDiv({
      container: containerRef.current,
      translations: [
        {
          id: "1",
          key: "common.buttons.submit",
          values: { en: "Submit", ko: "제출" },
          context: "Submit button",
        },
      ],
      languages: ["en", "ko"],
      defaultLanguage: "en",
    });

    return () => {
      editor.destroy();
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "600px" }} />;
}
```

### 방법 2: GitHub URL로 직접 설치 (배포용)

#### 1. localeEditor 빌드 및 커밋

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/localeEditor
pnpm package
git add dist
git commit -m "Add dist folder for package distribution"
git push
```

#### 2. frontend에서 설치

`frontend/package.json`에 추가:

```json
{
  "dependencies": {
    "localeeditor": "github:YOUR_USERNAME/Localize-editor#main"
  }
}
```

또는 pnpm으로 직접 설치:

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/frontend
pnpm add localeeditor@github:YOUR_USERNAME/Localize-editor#main
```

**주의**: 이 방법을 사용하려면 `dist` 폴더가 GitHub에 포함되어 있어야 합니다.

### 방법 3: 로컬 경로로 설치 (임시 테스트용)

```bash
cd /Users/miso/Desktop/Development/LocalizeKit/frontend
pnpm add localeeditor@file:../localeEditor
```

## API 사용법

### 기본 사용

```typescript
import { VirtualTableDiv } from "localeeditor";
import "localeeditor/styles";

const editor = new VirtualTableDiv({
  container: document.getElementById("editor")!,
  translations: [...],
  languages: ["en", "ko"],
  defaultLanguage: "en",
});

// 변경사항 가져오기
const changes = editor.getChanges();

// 변경사항 초기화
editor.clearChanges();

// 정리
editor.destroy();
```

### React에서 사용

```typescript
import { useEffect, useRef } from "react";
import { VirtualTableDiv } from "localeeditor";
import "localeeditor/styles";

export function LocaleEditorComponent({ translations, languages }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<VirtualTableDiv | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    editorRef.current = new VirtualTableDiv({
      container: containerRef.current,
      translations,
      languages,
      defaultLanguage: languages[0],
    });

    return () => {
      editorRef.current?.destroy();
    };
  }, [translations, languages]);

  return <div ref={containerRef} style={{ width: "100%", height: "600px" }} />;
}
```

## 타입 정의

TypeScript 타입은 자동으로 포함됩니다:

```typescript
import type { Translation, TranslationChange } from "localeeditor";
```

## 스타일

CSS를 반드시 import해야 합니다:

```typescript
import "localeeditor/styles";
// 또는
import "localeeditor/dist/index.css";
```

## 문제 해결

### 빌드가 안 될 때

```bash
cd localeEditor
pnpm package
```

### 타입 에러가 날 때

```bash
cd localeEditor
pnpm build:types
```

### workspace가 작동하지 않을 때

```bash
cd frontend
pnpm install
```
