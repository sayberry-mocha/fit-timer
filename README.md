# 핏타이머

운동 프로그램을 선택하고 세트 진행과 휴식을 기록하는 모바일 우선 정적 웹 앱입니다.

## 기능

- `src/app.js`에서 관리하는 대근육·중근육·소근육·테스트 프로그램
- iOS 9.3 이상의 구형 Safari를 위한 호환 JavaScript 제공
- 현재 운동/세트와 전체 진행률 표시
- 메인 패널 선택으로 세트 완료와 휴식 조기 종료
- 휴식 만료 시 효과음과 함께 다음 세트로 자동 전환
- 운동 중과 휴식 중을 구분하는 메인 패널 색상
- 백그라운드에서도 종료 시각을 기준으로 복구되는 휴식 타이머
- 실제 휴식 종료 효과음과 배경 변화를 재현하는 1초 알람 테스트
- iPhone·iPad 홈 화면용 전용 아이콘과 standalone 설정
- 진행 중인 운동 자동 저장 및 새로고침 복원
- 완료한 운동 기록을 브라우저에 저장

## 로컬 실행

`index.html`을 브라우저에서 직접 열어도 동작합니다. 정적 파일 서버로 테스트하려면 저장소 루트에서 다음 명령을 실행합니다.

```bash
python3 -m http.server 4173
```

그다음 <http://localhost:4173>에 접속합니다.

## 프로그램 수정

운동 순서, 세트 수, 휴식 시간은 [`src/app.js`](./src/app.js) 상단의 `PROGRAM_CONFIG`에서 수정합니다.

```js
const PROGRAM_CONFIG = {
  "version": 1,
  "restSeconds": 60,
  "programs": [
    {
      "id": "example",
      "name": "예시",
      "accent": "#ff7958",
      "restSeconds": 30,
      "exercises": [{ "name": "EX", "sets": 3 }]
    }
  ]
};
```

프로그램 안의 `restSeconds`를 생략하면 최상위 `restSeconds` 값(기본 60초)을 사용합니다.

수정한 원본을 구형 iOS 호환용 `app.js`로 변환하려면 다음 명령을 실행합니다.

```bash
npm install
npm run build
```

## GitHub Pages 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 정적 파일을 GitHub Pages에 배포합니다. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 한 번 지정해야 합니다.

기록과 진행 상태는 서버가 아니라 사용 중인 브라우저의 `localStorage`에만 저장됩니다.

사용된 웹폰트의 출처와 라이선스는 [`assets/FONT-LICENSES.md`](./assets/FONT-LICENSES.md)에서 확인할 수 있습니다.
