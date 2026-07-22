# 핏타이머

운동 프로그램을 선택하고 세트 진행과 1분 휴식을 기록하는 모바일 우선 정적 웹 앱입니다.

## 기능

- `app.js`에서 관리하는 대근육·중근육·소근육 프로그램
- 현재 운동/세트와 전체 진행률 표시
- 백그라운드에서도 종료 시각을 기준으로 정확히 복구되는 1분 타이머
- 휴식 완료 시 차분한 배경색 전환과 작은 효과음
- 진행 중인 운동 자동 저장 및 새로고침 복원
- 완료한 운동 기록을 브라우저에 저장

## 로컬 실행

`index.html`을 브라우저에서 직접 열어도 동작합니다. 정적 파일 서버로 테스트하려면 저장소 루트에서 다음 명령을 실행합니다.

```bash
python3 -m http.server 4173
```

그다음 <http://localhost:4173>에 접속합니다.

## 프로그램 수정

운동 순서, 세트 수, 휴식 시간은 [`app.js`](./app.js) 상단의 `PROGRAM_CONFIG`에서 수정합니다.

```js
const PROGRAM_CONFIG = {
  "version": 1,
  "restSeconds": 60,
  "programs": [
    {
      "id": "example",
      "name": "예시",
      "accent": "#ff7958",
      "exercises": [{ "name": "EX", "sets": 3 }]
    }
  ]
};
```

## GitHub Pages 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 정적 파일을 GitHub Pages에 배포합니다. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 한 번 지정해야 합니다.

기록과 진행 상태는 서버가 아니라 사용 중인 브라우저의 `localStorage`에만 저장됩니다.
