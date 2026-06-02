# Madmen Hub

친구들의 글, 잡담, 포인트, 업적을 보관하는 Express + Vanilla JS 기반 MVP입니다.

## MVP 1.1

- 자체 `users` 테이블, bcrypt 비밀번호 해시, JWT 인증
- `DB_PROVIDER=sqlite` 또는 `DB_PROVIDER=supabase`
- 출석, 방명록, 게시판, 포인트 거래, 칭호 상점, 업적, 활동 피드
- 관리자 운영 패널과 숨김 콘텐츠 관리
- 내부 포인트 전용 카지노 미니게임 4종
- 게시판 랜덤 글 보기와 확장된 칭호 seed
- 게시글 상세 페이지, 댓글, 익명 게시글과 익명 댓글

## 포인트 카지노

카지노는 사이트 내부 포인트만 사용하는 미니게임입니다. 현금 구매, 출금, 상품권, 현물, 외부 재화, 암호화폐, 환금 기능은 없습니다.

기본 제한:

- 하루 전체 카지노 플레이: 최대 30회
- 일반 최대 베팅: `min(500P, floor(balance * 0.5))`
- 룰렛: 최소 `10P`, 하루 20회
- 주사위 블랙잭: 최소 `20P`, 하루 10회
- 크래시: 최소 `10P`, 하루 10회
- 러시안 룰렛: 참가비 `30P` 고정, 하루 10회

카지노 제한은 환경변수로 조정할 수 있습니다. 값이 `0`이면 해당 제한을 적용하지 않습니다. 환경변수를 생략하면 위 기본값을 사용합니다. 러시안 룰렛의 참가비 `30P`는 제한 설정과 별개로 고정입니다.

```dotenv
CASINO_DAILY_LIMIT=0
CASINO_ROULETTE_DAILY_LIMIT=0
CASINO_BLACKJACK_DAILY_LIMIT=0
CASINO_CRASH_DAILY_LIMIT=0
CASINO_RUSSIAN_DAILY_LIMIT=0
CASINO_MAX_BET=0
CASINO_MAX_BET_BALANCE_RATIO=0
```

`CASINO_MAX_BET=0`과 `CASINO_MAX_BET_BALANCE_RATIO=0`을 함께 사용하면 일반 게임은 보유 포인트까지만 베팅할 수 있습니다.

룰렛 확률표:

| 배율 | 확률 |
| --- | ---: |
| `0x` | 45% |
| `0.5x` | 15% |
| `1x` | 15% |
| `2x` | 12% |
| `3x` | 8% |
| `5x` | 4% |
| `20x` | 1% |

주사위 블랙잭은 일반 승리 `2x`, 정확히 21 승리 `2.5x`, 무승부 `1x`입니다.

크래시는 서버가 숨겨진 크래시 배율을 먼저 결정합니다. 배율 구간 확률은 `1.05~1.50x` 50%, `1.50~3.00x` 30%, `3.00~8.00x` 15%, `8.00~20.00x` 4%, `20.00~50.00x` 1%입니다.

러시안 룰렛 생존 보상은 `1회 40P`, `2회 65P`, `3회 110P`, `4회 190P`, `5회 350P`입니다.

모든 베팅과 지급은 `point_transactions`, 모든 완료 결과는 `game_results`, 진행 중 게임은 `game_sessions`에 기록됩니다. 랜덤 결과는 서버의 `crypto.randomInt`로 생성합니다.

## SQLite 실행

```powershell
npm.cmd install
npm.cmd run db:init:sqlite
npm.cmd run dev
```

브라우저에서 `http://localhost:3000`에 접속합니다.

전체 회귀와 카지노 스모크 테스트:

```powershell
npm.cmd run test:smoke:sqlite
```

## Supabase 설정

이번 단계에서는 Supabase Auth를 사용하지 않습니다. Supabase는 PostgreSQL 저장소로만 사용하며 기존 JWT 인증을 유지합니다.

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `database/supabase.schema.sql`을 다시 실행합니다.
3. SQL Editor에서 `database/supabase.seed.sql`을 다시 실행합니다.
4. SQL Editor에서 `database/supabase.rpc.sql`을 실행합니다.
5. `.env`를 설정합니다.

```dotenv
DB_PROVIDER=supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
JWT_SECRET=change-this-secret
CLIENT_ORIGIN=http://localhost:3000
```

6. 서버 또는 테스트를 실행합니다.

```powershell
npm.cmd run dev
npm.cmd run test:smoke:supabase
```

Supabase 테스트는 `smoke_` 접두사의 임시 사용자를 만들고 FK 순서에 맞춰 관련 데이터를 정리합니다. 운영 프로젝트 대신 별도 테스트 프로젝트 사용을 권장합니다.

## 카지노 API

- `GET /api/casino/games`
- `GET /api/casino/me/limits`
- `GET /api/casino/history`
- `POST /api/casino/roulette/play`
- `POST /api/casino/dice-blackjack/start`
- `POST /api/casino/dice-blackjack/:sessionId/hit`
- `POST /api/casino/dice-blackjack/:sessionId/stand`
- `POST /api/casino/crash/start`
- `POST /api/casino/crash/:sessionId/cashout`
- `POST /api/casino/russian-roulette/start`
- `POST /api/casino/russian-roulette/:sessionId/pull`
- `POST /api/casino/russian-roulette/:sessionId/cashout`

## 게시판 API

- `GET /api/posts`
- `GET /api/posts/config`
- `GET /api/posts/random`
- `GET /api/posts/:id`
- `GET /api/posts/:id/comments`
- `POST /api/posts/:id/comments`
- `POST /api/posts`

`GET /api/posts/random`은 숨김 처리되지 않고 제목과 본문이 비어 있지 않은 게시글 하나를 반환합니다. 기존 quotes 호환 API와 대시보드의 `randomQuote` / `randomPost` alias는 유지합니다.

칭호 seed는 기본, 장난, 활동, 야간, 배포 테마를 포함한 24개 항목으로 확장되었습니다. 기존 DB에도 신규 칭호를 반영하려면 SQLite는 `npm.cmd run db:init:sqlite`, Supabase는 SQL Editor에서 `database/supabase.seed.sql`을 다시 실행하세요. 관리자 전용 칭호는 상점에서 구매할 수 없습니다.

## 게시글 상세와 댓글

게시판 목록에서 제목을 누르면 `/post.html?id={id}` 상세 페이지로 이동합니다. 상세 페이지에서는 게시글 본문과 공개 댓글을 확인하고, 로그인한 사용자는 댓글을 남길 수 있습니다. 숨김 게시글은 공개 상세 API에서 조회되지 않으며 숨김 댓글도 공개 목록에서 제외됩니다.

익명 작성과 댓글 보상 정책은 아래 환경변수로 조정합니다.

```dotenv
ANONYMOUS_POST_COST=5
ANONYMOUS_COMMENT_COST=2
COMMENT_REWARD_POINTS=2
COMMENT_REWARD_DAILY_LIMIT=5
```

- 익명 게시글은 기본 `5P`, 익명 댓글은 기본 `2P`를 사용합니다.
- 일반 댓글과 익명 댓글 모두 기본 `2P` 작성 보상을 받습니다.
- 댓글 보상은 기본 하루 `5회`까지만 지급하며, 제한 이후에도 댓글 작성은 가능합니다.
- 비용이나 보상 제한 값을 `0`으로 설정하면 각각 무료 또는 제한 없음으로 처리합니다.
- 익명 작성자의 실제 작성자 정보는 공개 API와 공개 피드에 노출하지 않습니다.
- 관리자 패널의 게시글·댓글 관리 화면에서만 익명 작성자의 실제 표시명과 유저 ID를 확인할 수 있습니다.

기존 Supabase 프로젝트에는 `post_comments` 테이블과 익명 컬럼을 추가해야 합니다. SQL Editor에서 아래 순서로 다시 실행하세요.

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`

## MVP 1.4 꾸미기 상점

`/cosmetics.html`에서 포인트로 프로필 테두리, 프로필 배경, 닉네임 색상을 구매하고 장착할 수 있습니다. 장착 효과는 프로필, 거주민 목록, dashboard 카드, 랭킹, 게시글 작성자, 댓글 작성자에 가볍게 반영됩니다.

DB 테이블:

- `cosmetic_items`: 판매 가능한 꾸미기 아이템
- `user_cosmetics`: 사용자 보유 아이템
- `user_cosmetic_equips`: 타입별 현재 장착 슬롯

주요 API:

- `GET /api/cosmetics/shop?type=&rarity=`
- `POST /api/cosmetics/:id/buy`
- `GET /api/me/cosmetics`
- `GET /api/me/cosmetics/equips`
- `POST /api/me/cosmetics/equip`
- `POST /api/me/cosmetics/unequip`
- `GET /api/admin/cosmetics`
- `POST /api/admin/cosmetics`
- `PATCH /api/admin/cosmetics/:id`
- `PATCH /api/admin/cosmetics/:id/active`

SQLite 구매는 로컬 트랜잭션으로 처리합니다. Supabase 구매는 `buy_cosmetic_transaction` RPC에서 advisory lock을 잡고 보유 여부 확인, 포인트 차감, 거래 내역 기록, 보유 목록 추가를 한 번에 처리합니다. 같은 아이템을 동시에 구매해도 포인트가 중복 차감되지 않습니다.

기존 Supabase 프로젝트에는 MVP 1.3의 `quotes.category`와 MVP 1.4 꾸미기 테이블 및 RPC를 함께 반영해야 합니다. SQL Editor에서 아래 순서로 다시 실행하세요.

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`

익명 게시글과 익명 댓글 응답에는 실제 작성자의 꾸미기 장착 정보를 포함하지 않습니다. `SUPABASE_SERVICE_ROLE_KEY`도 공개 파일이나 클라이언트 코드에 포함하지 마세요.

## MVP 1.3 게시판 카테고리와 검색

게시판은 글 작성 시 카테고리를 선택하고, 목록에서 검색어, 카테고리, 태그, 정렬 조건으로 글을 찾을 수 있습니다. 랜덤 게시글도 현재 선택한 카테고리와 태그 조건 안에서 조회합니다.

지원 카테고리:

- `general`: 잡담
- `notice`: 공지/안내
- `meme`: 짤/드립
- `game`: 게임
- `casino`: 카지노
- `music`: 음악
- `anonymous`: 익명
- `record`: 기록문
- `suggestion`: 건의사항

`notice`는 관리자와 owner만 작성할 수 있습니다. 익명 작성 여부는 카테고리와 독립적으로 동작합니다.

주요 API:

- `GET /api/posts/categories`
- `GET /api/posts?q=&category=&tag=&author=&sort=latest&limit=50&offset=0`
- `GET /api/posts/random?category=&tag=`
- `POST /api/posts`
- `GET /api/admin/posts?q=&category=&tag=&userId=&includeHidden=true`

기존 `/api/quotes`, dashboard의 `recentQuotes`, `randomQuote`는 게시글 API 호환 alias로 유지됩니다.

기존 Supabase 프로젝트에는 `quotes.category` 컬럼과 인덱스를 추가해야 합니다. SQL Editor에서 아래 순서로 다시 실행하세요.

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`

이번 단계는 새 RPC를 추가하지 않습니다. 익명 비용과 댓글 보상은 기존 `apply_point_transaction` RPC를 사용합니다.

## DB Provider 구조

- `server/db.js`: provider facade
- `server/repositories/sqlite.js`: SQLite 구현과 자동 초기화
- `server/repositories/supabase.js`: Supabase query builder 어댑터
- `server/repositories/casino.repo.js`: 카지노용 provider-aware repository
- `server/repositories/admin.repo.js`: provider-safe 관리자 API repository
- `server/repositories/rpc.repo.js`: Supabase PostgreSQL RPC 호출 wrapper
- `server/supabaseClient.js`: 서버 전용 admin client

## 보안 주의

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용입니다. `public/js` 또는 HTML에 절대 넣지 마세요.
- `.env`는 Git에 커밋하지 마세요.
- 프론트엔드는 Supabase에 직접 접근하지 않습니다.
- 클라이언트가 보낸 payout, 배율, 주사위, 탄창 위치, 결과 값은 사용하지 않습니다.
- 공개 대시보드에는 카지노 내부 state를 노출하지 않습니다.
- RLS 정책은 Supabase Auth 도입 시 다시 설계합니다.

## Supabase RPC

Supabase 모드에서는 포인트 변경과 관련된 다단계 쓰기를 PostgreSQL RPC 트랜잭션으로 처리합니다. SQLite 모드는 기존 로컬 트랜잭션 흐름을 유지합니다.

- `apply_point_transaction`
- `buy_title_transaction`
- `admin_apply_points_transaction`
- `unlock_achievement_transaction`
- `create_game_session_transaction`
- `complete_game_session_transaction`
- `play_instant_game_transaction`

`database/supabase.rpc.sql`은 `CREATE OR REPLACE FUNCTION`을 사용하므로 다시 실행할 수 있습니다. 운영 DB에 적용하기 전에는 백업을 권장합니다. smoke-test는 API를 통해 RPC 경로와 중복 구매, 중복 업적 보상, 중복 게임 완료 방지를 확인합니다.

함수 적용 후에는 smoke-test를 실행하세요. 운영 DB에서 임의의 사용자 ID로 수동 지급 쿼리를 실행하지 마세요.

```powershell
npm.cmd run test:smoke:supabase
```
- 오래 방치된 active 카지노 세션의 자동 만료 처리는 후속 작업입니다.
- SQLite 사용 시 `sqlite3`의 전이 빌드 도구 의존성에서 `npm audit` 취약점이 보고됩니다.
## Render Docker 배포

Render 운영 배포에서는 SQLite 파일을 사용하지 않고 Supabase를 운영 DB로 사용합니다.

1. Supabase Dashboard의 SQL Editor에서 아래 파일을 순서대로 실행합니다.
   - `database/supabase.schema.sql`
   - `database/supabase.seed.sql`
   - `database/supabase.rpc.sql`
2. Render에서 **New Web Service**를 생성하고 GitHub 저장소를 연결합니다.
3. Runtime 또는 Language로 **Docker**를 선택합니다.
4. Dockerfile Path를 `./Dockerfile`로 설정합니다.
5. Health Check Path를 `/health`로 설정합니다.
6. 아래 환경변수를 Render 대시보드에서 설정합니다.

```dotenv
NODE_ENV=production
DB_PROVIDER=supabase
JWT_SECRET=change-this-to-a-long-random-secret
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
CLIENT_ORIGIN=https://서비스명.onrender.com
```

`render.yaml`의 `CLIENT_ORIGIN=https://madmen-hub.onrender.com`은 예시입니다. 실제 Render 서비스 주소로 교체하세요. Render가 런타임 `PORT`를 주입하며 서버는 `0.0.0.0`에 바인딩됩니다.

배포 전 주의사항:

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 `public` 파일, Dockerfile, Git 저장소에 넣지 않습니다.
- `.env`는 커밋하거나 Docker image에 복사하지 않습니다.
- Render 운영 배포에서는 SQLite를 사용하지 않습니다.
- Render의 기본 파일시스템을 영속 저장소로 사용하지 않습니다.
- 운영 DB에는 Supabase를 사용합니다.

Docker CLI가 설치된 로컬 환경에서는 아래 명령으로 image와 health check를 검증할 수 있습니다.

```powershell
docker build -t madmen-hub .
docker run --rm -p 3000:10000 --env-file .env -e PORT=10000 madmen-hub
```

컨테이너 실행 후 `http://localhost:3000/health`가 `{"success":true,"status":"ok"}`를 반환하는지 확인하세요.

## MVP 1.2 노래추천과 일일 미션

`/songs.html`에서 노래추천 목록, 추천 등록, 익명 추천, 랜덤 노래, 오늘의 노래를 사용할 수 있습니다.

- 익명 노래추천은 기본 `3P`를 사용합니다.
- 노래추천 작성 보상은 기본 `5P`, 하루 `3회`까지입니다.
- 로그인 사용자의 랜덤 노래 조회 보상은 기본 `1P`, 하루 `1회`까지입니다.
- 오늘의 노래는 KST 날짜를 seed로 사용해 같은 날에는 동일한 추천을 반환합니다.
- 익명 추천은 공개 API에서 작성자 ID와 실제 작성자를 노출하지 않습니다. 관리자 API에서만 확인할 수 있습니다.

dashboard의 `오늘의 관찰 과제` 카드에서 KST 기준 일일 미션 진행 상태와 보상, 보너스를 확인할 수 있습니다. 출석, 게시글, 댓글, 랜덤 게시글, 노래추천, 랜덤 노래, 카지노 플레이가 미션에 반영됩니다. 보상은 `/api/missions/daily/:missionCode/claim`, 보너스는 `/api/missions/daily/bonus/:bonusCode/claim`에서 한 번만 지급됩니다.

기존 Supabase 프로젝트에는 새 테이블과 미션 보상 RPC가 필요합니다. SQL Editor에서 다음 순서로 다시 실행하세요.

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`
