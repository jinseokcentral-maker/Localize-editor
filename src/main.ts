import './style.css';

// Step 1: 타입 정의 완료
const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div style="padding: 2rem; font-family: system-ui; max-width: 1200px; margin: 0 auto;">
    <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem;">
      Locale Editor
    </h1>
    <p style="color: #666; margin-bottom: 2rem;">
      Excel-like i18n translation editor
    </p>
    
    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
      <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #0369a1;">
        ✅ Step 1: 타입 정의 완료
      </h2>
      <p style="color: #075985; margin: 0;">
        Translation 및 LocaleEditorOptions 타입이 정의되었고, 모든 테스트가 통과했습니다.
      </p>
    </div>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 1.5rem;">
      <h2 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">
        다음 단계
      </h2>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 0.5rem 0; color: #6b7280;">
          <span style="color: #059669; font-weight: 600;">✓</span> Step 1: 타입 정의
        </li>
        <li style="padding: 0.5rem 0; color: #6b7280;">
          <span style="color: #d1d5db;">○</span> Step 2: AG Grid 통합
        </li>
        <li style="padding: 0.5rem 0; color: #6b7280;">
          <span style="color: #d1d5db;">○</span> Step 3: 셀 편집 기능
        </li>
      </ul>
    </div>
  </div>
`;

console.log('Step 1: 타입 정의 완료');

