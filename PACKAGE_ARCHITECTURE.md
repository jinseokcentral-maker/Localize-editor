# LocaleEditor - 독립 패키지 아키텍처

## 🎯 목표
- **독립적인 npm 패키지**로 개발
- **별도 git 저장소**로 관리
- 프론트엔드에서 `import { LocaleEditor } from '@localizekit/locale-editor'` 형태로 사용
- **에디터 기능에만 집중**

---

## 📦 기술 스택

### 핵심 라이브러리

#### 1. **빌드 도구: Vite** ⭐
```bash
pnpm add -D vite @vitejs/plugin-react
```
- ✅ 빠른 개발 서버
- ✅ 라이브러리 모드 지원 (UMD, ESM, CJS)
- ✅ Tree-shaking 최적화
- ✅ TypeScript 지원

#### 2. **에디터 그리드: @glideapps/glide-data-grid**
```bash
pnpm add @glideapps/glide-data-grid
```
- ✅ Excel-like 스프레드시트
- ✅ 가상 스크롤 내장
- ✅ 셀 편집, 복사/붙여넣기

#### 3. **상태 관리: Zustand**
```bash
pnpm add zustand
```
- ✅ 경량 (1KB)
- ✅ 에디터 내부 상태 관리
- ✅ Dirty cells, 선택 상태 등

#### 4. **검색: 하이브리드 접근**
- **클라이언트**: 기본 필터링 (React useMemo)
- **서버**: props로 검색 함수 받기 (의존성 분리)

#### 5. **스타일링: Tailwind CSS** (독립적)
```bash
pnpm add -D tailwindcss postcss autoprefixer
```
- ✅ 독립적인 스타일 (프론트엔드와 충돌 방지)
- ✅ CSS 변수로 테마 커스터마이징 가능

#### 6. **타입스크립트**
- ✅ 엄격한 타입 체크
- ✅ .d.ts 자동 생성

#### 7. **테스팅: Vitest** (선택)
```bash
pnpm add -D vitest @testing-library/react
```

---

## 🏗️ 프로젝트 구조

```
localeEditor/
├── .git/                    # 독립 git 저장소
├── package.json
├── vite.config.ts           # 라이브러리 빌드 설정
├── tsconfig.json
├── tailwind.config.js       # 독립 Tailwind 설정
├── postcss.config.js
├── README.md
├── LICENSE
├── .gitignore
│
├── src/
│   ├── index.ts             # 진입점 (export)
│   ├── components/
│   │   ├── LocaleEditor.tsx # 메인 컴포넌트
│   │   ├── DataGrid.tsx     # GlideDataGrid 래퍼
│   │   ├── SearchBar.tsx
│   │   ├── Toolbar.tsx
│   │   └── CellEditor.tsx
│   ├── hooks/
│   │   ├── useEditorState.ts
│   │   ├── useSearch.ts
│   │   └── useVirtualScroll.ts
│   ├── stores/
│   │   └── editorStore.ts   # Zustand store
│   ├── types/
│   │   └── index.ts         # 공개 타입
│   ├── utils/
│   │   ├── search.ts
│   │   └── validation.ts
│   └── styles/
│       └── index.css        # Tailwind imports
│
├── dist/                    # 빌드 출력
│   ├── locale-editor.es.js
│   ├── locale-editor.umd.js
│   ├── locale-editor.d.ts
│   └── style.css
│
├── examples/               # 개발용 예제
│   └── dev.html
│
└── tests/                  # 테스트 (선택)
    └── LocaleEditor.test.tsx
```

---

## 📝 package.json 구조

```json
{
  "name": "@localizekit/locale-editor",
  "version": "0.1.0",
  "description": "Excel-like i18n translation editor",
  "type": "module",
  "main": "./dist/locale-editor.umd.js",
  "module": "./dist/locale-editor.es.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/locale-editor.es.js",
      "require": "./dist/locale-editor.umd.js",
      "types": "./dist/index.d.ts"
    },
    "./style": "./dist/style.css"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@glideapps/glide-data-grid": "^6.0.3",
    "zustand": "^5.0.9"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.9.3",
    "vite": "^7.2.7",
    "vitest": "^4.0.15"
  }
}
```

---

## ⚙️ Vite 설정 (라이브러리 모드)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'LocaleEditor',
      formats: ['es', 'umd'],
      fileName: (format) => `locale-editor.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    cssCodeSplit: false,
  },
});
```

---

## 🎨 API 설계 (컴포넌트 인터페이스)

```typescript
// src/types/index.ts
export interface Translation {
  id: string;
  key: string;
  values: Record<string, string>; // { en: "Hello", ko: "안녕" }
  context?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface LocaleEditorProps {
  // 데이터
  translations: Translation[];
  languages: string[]; // ['en', 'ko', 'ja']
  defaultLanguage: string; // 'en'
  
  // 콜백
  onCellChange?: (id: string, lang: string, value: string) => void;
  onSave?: (changes: TranslationChange[]) => Promise<void>;
  onSearch?: (query: string) => Promise<Translation[]>; // 서버 검색 (선택)
  
  // 설정
  readOnly?: boolean;
  showContext?: boolean;
  enableHistory?: boolean; // Pro+ 기능
  
  // 스타일
  theme?: 'light' | 'dark';
  className?: string;
}

export interface TranslationChange {
  id: string;
  key: string;
  lang: string;
  oldValue: string;
  newValue: string;
}
```

---

## 🔌 사용 예시 (프론트엔드에서)

```typescript
// frontend/app/pages/TranslationEditorPage.tsx
import { LocaleEditor } from '@localizekit/locale-editor';
import '@localizekit/locale-editor/style';

export function TranslationEditorPage() {
  const { data: translations } = useQuery({
    queryKey: ['translations', projectId],
    queryFn: () => fetchTranslations(projectId),
  });

  const handleSave = async (changes) => {
    await updateTranslations(projectId, changes);
  };

  return (
    <LocaleEditor
      translations={translations}
      languages={project.languages}
      defaultLanguage={project.defaultLanguage}
      onSave={handleSave}
      readOnly={!hasEditorPermission}
    />
  );
}
```

---

## 🚀 개발 워크플로우

### 1. **로컬 개발**
```bash
cd localeEditor
pnpm install
pnpm dev  # Vite dev server (예제 페이지)
```

### 2. **빌드**
```bash
pnpm build  # dist/ 폴더에 생성
```

### 3. **프론트엔드에서 링크 사용** (개발 중)
```bash
# localeEditor에서
pnpm link

# frontend에서
cd ../frontend
pnpm link @localizekit/locale-editor
```

### 4. **배포** (나중에)
```bash
# npm publish (또는 private registry)
pnpm publish
```

---

## 📦 의존성 전략

### **peerDependencies**
- `react`, `react-dom`: 프론트엔드에서 제공

### **dependencies** (번들에 포함)
- `@glideapps/glide-data-grid`: 에디터 핵심
- `zustand`: 내부 상태 관리

### **devDependencies**
- 빌드 도구, 타입스크립트, 테스팅

---

## 🎯 핵심 원칙

1. **독립성**: 프론트엔드와 완전 분리
2. **경량**: 최소한의 의존성
3. **타입 안전성**: TypeScript 엄격 모드
4. **성능**: 가상 스크롤, 메모이제이션
5. **커스터마이징**: props로 테마, 콜백 제어

---

## 🔍 검색 전략 (에디터 내부)

### 클라이언트 사이드 필터링 (기본)
```typescript
// src/hooks/useSearch.ts
export function useSearch(
  translations: Translation[],
  query: string
) {
  return useMemo(() => {
    if (!query) return translations;
    
    const lowerQuery = query.toLowerCase();
    return translations.filter(t => 
      t.key.toLowerCase().includes(lowerQuery) ||
      Object.values(t.values).some(v => 
        v?.toLowerCase().includes(lowerQuery)
      )
    );
  }, [translations, query]);
}
```

### 서버 검색 (선택적, props로 받기)
```typescript
// 에디터는 onSearch prop만 호출
// 실제 검색 로직은 프론트엔드에서 구현
if (props.onSearch) {
  const results = await props.onSearch(query);
  setFilteredTranslations(results);
}
```

---

## 📊 성능 목표

- **초기 렌더링**: < 200ms (1,000개 키)
- **검색 필터링**: < 50ms (클라이언트)
- **스크롤 FPS**: 60fps
- **번들 크기**: < 200KB (gzip)

---

## 🧪 테스팅 전략

```typescript
// tests/LocaleEditor.test.tsx
import { render, screen } from '@testing-library/react';
import { LocaleEditor } from '../src';

test('renders translations', () => {
  render(
    <LocaleEditor
      translations={mockTranslations}
      languages={['en', 'ko']}
      defaultLanguage="en"
    />
  );
  expect(screen.getByText('common.buttons.submit')).toBeInTheDocument();
});
```

---

## 📚 다음 단계

1. ✅ 프로젝트 초기화 (`pnpm init`)
2. ✅ Vite 설정
3. ✅ 기본 컴포넌트 구조
4. ✅ GlideDataGrid 통합
5. ✅ 검색 기능
6. ✅ 저장 로직
7. ✅ 문서화

