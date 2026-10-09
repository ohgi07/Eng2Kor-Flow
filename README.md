# Eng2Kor Flow - 영한 자동 변환

한/영 키를 깜빡하고 영문 자판으로 친 한글을 입력 중에 자동으로 바꿔 주는 크롬 확장입니다.

```
dkssudgktpdy  →  안녕하세요
```

- 스페이스, Enter, 문장부호를 칠 때 바로 앞 단어를 바꿉니다.
- 치는 동안 단어가 무엇으로 바뀔지 커서 아래 말풍선으로 미리 보여 줍니다. 받침이 다음 글자로 넘어갈지 모르는 낱자는 흐리게 표시합니다. 팝업에서 끌 수 있습니다.
- 바뀐 직후 Backspace를 누르면 원래 글자로 돌아갑니다. 스페이스로 바뀐 경우에는 첫 Backspace가 공백만 지우고, 이어서 한 번 더 누르면 돌아갑니다.
- 되돌린 단어는 그 자리에 그대로 둡니다. 글자를 고쳐 치거나 같은 단어를 나중에 다시 치면 다시 바꿉니다.
- 비밀번호 칸에서는 동작하지 않습니다. 입력 내용은 저장하거나 전송하지 않습니다.

## 개발

```bash
node --test                 # 단위 테스트 + 평가 묶음
node scripts/serve.mjs      # http://127.0.0.1:8080/test/playground.html (?direct=1 은 확장 없이)
```

- 크롬 `chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램을 로드합니다" → `extension` 폴더.
- `test/slate.html?direct=1`은 Discord와 같은 Slate 편집기에서 변환을 확인하는 페이지입니다.
- 영어 사전은 `node scripts/gen-words.mjs <SCOWL 단어 목록>`으로 다시 만듭니다.
- 아이콘은 `node scripts/make-icons.mjs`, 스토어 이미지는 `node scripts/screenshot.mjs`로 만듭니다(크롬 경로는 환경 변수 `CHROME`).
- 스토어 업로드용 zip: `powershell -File scripts/pack.ps1`

## 지원 현황

2026-10-10, 크롬에서 확인했습니다.

| 사이트 | 편집기 | 스페이스 | 유지 | Enter | 복원 | Ctrl+Z |
|---|---|---|---|---|---|---|
| 구글 검색 | textarea | ✅ | ✅ | ✅ 검색어 변환 | ✅ | ✅ |
| 유튜브 댓글 | contenteditable | ✅ | ✅ | - | ✅ | ✅ |
| GitHub 이슈 본문 | textarea | ✅ | ✅ | ✅ 줄바꿈 | ✅ | ✅ |
| Gmail 본문 | contenteditable | ✅ | ✅ | ✅ 줄바꿈 | ✅ | ✅ 여러 단계를 한 번에 되돌림 |
| ChatGPT | ProseMirror | ✅ | ✅ | ✅ 변환 후 전송 | ✅ | ✅ 빠른 입력은 한 번에 되돌림 |
| Claude | ProseMirror | ✅ | ✅ | ✅ 변환 후 전송 | ✅ | ✅ 빠른 입력은 한 번에 되돌림 |
| Discord | Slate | ✅ | ✅ | ✅ 변환 후 전송 | ✅ | ✅ |
| Colab 텍스트 셀 | Monaco | ✅ | ✅ | ✅ | ✅ | ✅ |
| Colab 코드 셀 | Monaco | ✅ 주석·문자열 안만 | ✅ | ✅ | ✅ | ✅ |
| 네이버 검색, Slack, Notion | | 미확인 | | | | |

## 알려진 한계

- 두벌식 자판 기준입니다.
- 구글 문서는 아직 지원하지 않습니다(다음 버전 예정).
- 비밀번호 판정은 type·autocomplete·마스킹 스타일·name/id 신호가 있는 입력칸만 보장합니다.
- `beforeinput`을 받아들이지 않는 자체 모델 편집기는 화면과 내용이 어긋날 수 있습니다. 문제가 있는 사이트는 팝업에서 끌 수 있습니다.
