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
- 일반 최대 베팅: `min(500 P, floor(balance * 0.5))`
- 룰렛: 최소 `10 P`, 하루 20회
- 주사위 블랙잭: 최소 `20 P`, 하루 10회
- 크래시: 최소 `10 P`, 하루 10회
- 러시안 룰렛: 참가비 `30 P` 고정, 하루 10회

카지노 제한은 환경변수로 조정할 수 있습니다. 값이 `0`이면 해당 제한을 적용하지 않습니다. 환경변수를 생략하면 위 기본값을 사용합니다. 러시안 룰렛의 참가비 `30 P`는 제한 설정과 별개로 고정입니다.

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

주사위 블랙잭은 일반 승리 `1.85x`, 정확히 21 승리 `2.15x`, 무승부 push `1x`입니다. 딜러는 16 이하에서 굴리고 17 이상에서 멈춥니다.

크래시는 서버가 숨겨진 크래시 배율을 먼저 결정합니다. 배율 구간 확률은 `1.05~1.50x` 50%, `1.50~3.00x` 30%, `3.00~8.00x` 15%, `8.00~20.00x` 4%, `20.00~50.00x` 1%입니다.

러시안 룰렛 생존 보상은 참가비 `30 P` 기준 `1회 32 P`, `2회 38 P`, `3회 58 P`, `4회 105 P`, `5회 210 P`입니다. 1~2발 캐시아웃은 안전하지만 수익이 작고, 3발 이상부터 고위험 보상이 커집니다.

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

칭호 seed는 상점, 카지노, 활동, 시즌 보상, 이벤트, 관리자, 처벌 콘셉트를 포함한 42개 고유 항목으로 확장되었습니다. 기존 DB에도 신규 칭호를 반영하려면 SQLite는 `npm.cmd run db:init:sqlite`, Supabase는 SQL Editor에서 `database/supabase.seed.sql`을 다시 실행하세요. 보상/관리자/처벌 전용 칭호는 상점에서 구매할 수 없습니다.

## 게시글 상세와 댓글

게시판 목록에서 제목을 누르면 `/post.html?id={id}` 상세 페이지로 이동합니다. 상세 페이지에서는 게시글 본문과 공개 댓글을 확인하고, 로그인한 사용자는 댓글을 남길 수 있습니다. 숨김 게시글은 공개 상세 API에서 조회되지 않으며 숨김 댓글도 공개 목록에서 제외됩니다.

익명 작성과 댓글 보상 정책은 아래 환경변수로 조정합니다.

```dotenv
ANONYMOUS_POST_COST=5
ANONYMOUS_COMMENT_COST=2
COMMENT_REWARD_POINTS=2
COMMENT_REWARD_DAILY_LIMIT=5
```

- 익명 게시글은 기본 `5 P`, 익명 댓글은 기본 `2 P`를 사용합니다.
- 일반 댓글과 익명 댓글 모두 기본 `2 P` 작성 보상을 받습니다.
- 댓글 보상은 기본 하루 `5회`까지만 지급하며, 제한 이후에도 댓글 작성은 가능합니다.
- 비용이나 보상 제한 값을 `0`으로 설정하면 각각 무료 또는 제한 없음으로 처리합니다.
- 익명 작성자의 실제 작성자 정보는 공개 API와 공개 피드에 노출하지 않습니다.
- 관리자 패널의 게시글·댓글 관리 화면에서만 익명 작성자의 실제 표시명과 유저 ID를 확인할 수 있습니다.

기존 Supabase 프로젝트에는 `post_comments` 테이블과 익명 컬럼을 추가해야 합니다. SQL Editor에서 아래 순서로 다시 실행하세요.

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`

## V1.8.5 시즌 보상 / 프로필 박제

시즌 종료 결과를 칭호, 알림, 프로필 기록으로 연결합니다. 시즌 랭킹은 실시간 기록이고, 명예의 전당은 종료 시점의 고정 기록이며, 시즌 보상 칭호와 트로피는 유저 프로필에 남는 대표 기록입니다.

V1.8.5.1부터 시즌 결과는 “칭호”와 “트로피 기록”으로 분리됩니다. 대부분의 category는 `user_season_trophies`에만 남고, `user_titles`에 들어가는 시즌 보상 칭호는 대표 category로 제한됩니다.

새 테이블:

- `season_reward_mappings`: 랭킹 category/rank 범위와 보상 칭호 `title_id` 매핑
- `season_reward_grants`: 시즌/유저/칭호/category별 지급 로그와 중복 지급 방지 상태
- `user_season_trophies`: 프로필에 표시할 시즌 대표 기록, 점수, 보상 칭호, 설명

기본 reward mapping은 seed와 서비스 보정 로직에 모두 들어 있습니다. active title mapping은 `activity_score`, `casino_loss`, `point_earned`, `community_activity` 1위만 사용합니다. 나머지 주요 category는 trophy-only 기록으로 프로필에 남습니다. title id는 환경마다 다를 수 있으므로 seed는 칭호 이름 기준으로 매핑을 생성합니다.

대표 시즌 칭호:

- `activity_score`: 시즌의 지배자
- `casino_loss`: 시즌 대참사
- `point_earned`: 포인트 위에 누운 자
- `community_activity`: 격리소 서기관

trophy-only 기본 category:

- `net_points`, `casino_profit`, `casino_net_profit`, `casino_net_loss`
- `casino_plays`, `post_count`, `song_count`, `daily_mission_count`, `cosmetic_spent`, `attendance_count`
- `balance_peak`, `drawdown_rate`, `biggest_casino_win`, `biggest_casino_loss`, `point_turnover`
- `russian_cashout_count`, `blackjack_profit`

같은 season에서 같은 user가 자동으로 받는 시즌 보상 칭호는 최대 2개입니다. 제한 초과 항목은 `skippedUserLimit`으로 표시되며, 칭호 대신 트로피 기록만 생성됩니다.

추가 API:

- `GET /api/me/season-trophies`
- `GET /api/users/:id/season-trophies`
- `GET /api/admin/seasons/:id/reward-preview`
- `POST /api/admin/seasons/:id/grant-rewards`
- `POST /api/admin/seasons/:id/revoke-reward`
- `GET /api/admin/season-reward-mappings`

운영 흐름:

1. 시즌 종료 또는 명예의 전당 재생성으로 `season_hall_of_fame`을 확정합니다.
2. 관리자 화면에서 보상 미리보기를 확인합니다.
3. `grant-rewards`로 확정 지급합니다. `willGrantTitle=true`인 항목만 `user_titles`에 들어갑니다.
4. trophy-only 및 제한 초과 항목은 `user_season_trophies`에만 저장됩니다.
5. title grant 결과는 `season_reward_grants`에 남고, 프로필 표시용 기록은 `user_season_trophies`에 저장됩니다.
6. 보상 알림은 title grant 중심으로 생성됩니다.

회수는 관리자 API에서 `revokeTitle=false`면 지급 로그만 `revoked`로 바꾸고, `revokeTitle=true`면 실제 `user_titles` 회수도 시도합니다. 같은 칭호를 다른 경로로 보유해야 하는 운영 상황에서는 `revokeTitle=false`를 우선 권장합니다.

프로필의 “시즌 박제 기록” 섹션은 최근 시즌 트로피를 표시합니다. 익명 글/댓글 작성 정보와 연결하지 않고, 공개 가능한 시즌 랭킹/명예의 전당 기반 기록만 노출합니다.

시즌 보상 칭호는 일반 칭호와 구분되는 `title-season-reward` 배지 스타일을 사용합니다. 정책 변경 전 이미 지급된 시즌 보상 칭호는 자동 삭제/회수하지 않습니다. 필요하면 관리자 회수 도구로 수동 처리하세요.

V1.8.5.2부터 시즌 트로피는 원본 `user_season_trophies` row를 그대로 보존하면서 UI/API에서 표시용 그룹을 추가로 제공합니다. 칭호 지급 정책은 바꾸지 않았고, trophy-only 기록만 비슷한 주제로 묶어 관리자 preview와 프로필 박제 기록을 더 짧게 보여줍니다.

트로피 그룹:

- `point`: 포인트 획득, 순증감, 최고 보유 포인트
- `point_spent`: 포인트 소비, 꾸미기 소비, 포인트 회전율
- `casino_profit`: 카지노 수익, 카지노 순수익, 블랙잭 수익, 단일 최대 승리
- `casino_loss`: 카지노 대참사, 카지노 순손실, 단일 최대 손실
- `drawdown`: 최고점 추락폭, 추락률
- `activity`: 활동 종합, 게시글, 댓글, 일일 미션, 출석
- `casino_behavior`: 카지노 플레이, 러시안 룰렛 2발 캐시아웃
- `content`: 노래추천
- `misc`: 알 수 없는 category fallback

`GET /api/me/season-trophies`와 `GET /api/users/:id/season-trophies`는 기존 `items` raw trophy 목록을 유지하고 `groupedItems`를 추가합니다. 관리자 `GET /api/admin/seasons/:id/reward-preview`는 기존 `items`/`rows` 외에 `titleGrantRows`, `trophyOnlyRows`, `groupedTrophyRows`를 내려줍니다. 관리자 화면은 “칭호 지급 예정”과 “프로필 트로피 기록” 섹션을 분리하고, 프로필은 grouped trophy card를 우선 표시합니다.

운영 Supabase에 V1.8.5를 반영할 때도 SQL Editor에서 다음 순서로 다시 실행하세요.

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`

## V1.8.5.3 시즌 칭호 4종 체계

시즌 보상은 이제 4개 대표 시즌 칭호 중심으로 정리됩니다. 세부 트로피 기록은 `user_season_trophies`에 계속 보존하지만, 프로필과 관리자 preview에서는 보조 기록으로 접어 보여줍니다.

active title reward mapping은 다음 4개만 사용합니다.

- `activity_score` → `시즌의 지배자` (`season_style=dominator`)
- `casino_loss` → `시즌 대참사` (`season_style=disaster`)
- `point_earned` → `포인트 위에 누운 자` (`season_style=fortune`)
- `community_activity` → `격리소 서기관` (`season_style=archivist`)

`community_activity`는 시즌 랭킹/보상용 통합 커뮤니티 활동 점수입니다.

```text
community_activity = post_count * 3 + comment_count * 1 + song_count * 2
```

표시는 `12점`, `1,234점` 형식을 사용합니다. `drawdown`, `point_spent`, `comment_count`, `song_count`, `biggest_casino_loss`, `30000P의 꿈` 같은 기존 시즌 보상 매핑은 active title mapping에서 제외됩니다. 기존에 이미 지급된 칭호나 시즌 기록은 자동 삭제/회수하지 않습니다.

시즌 전용 배지는 `title-season-reward`에 더해 `title-season-dominator`, `title-season-disaster`, `title-season-fortune`, `title-season-archivist` 클래스를 사용합니다. 향후 Battle/Deal Arena 시즌 칭호를 위해 `battle`, `upset` 스타일 값도 예약되어 있습니다.

## V1.8.6-A 홈 경량화 준비

이번 단계는 홈을 완전히 다시 만드는 작업이 아니라, 병목을 볼 수 있게 만들고 메뉴 구조를 정리하는 준비 작업입니다. 홈은 가벼운 입구로 두고, 무거운 목록과 통계는 각 탭에서 불러오는 방향으로 후속 작업을 이어갑니다.

성능 진단 로그는 브라우저 콘솔에서 아래처럼 켤 수 있습니다.

```js
localStorage.DEBUG_DASHBOARD = 'true';
location.reload();
```

끄려면 다음을 실행합니다.

```js
localStorage.removeItem('DEBUG_DASHBOARD');
location.reload();
```

활성화하면 콘솔에 `dashboard` 범위 로그가 출력됩니다.

- `[dashboard] init start`
- `[dashboard] api GET /api/dashboard 312ms 200 ok`
- `[dashboard] render home 94ms`
- `[dashboard] init total 1412ms`
- `[dashboard] initial api count 2`
- `[dashboard] initial api list`

로그는 URL, method, status, ok 여부, 소요 시간만 기록합니다. JWT, 비밀번호, Supabase key, API 응답 body 전체는 출력하지 않습니다.

정리된 상위 탭 구조:

- 홈
- 커뮤니티
- 카지노
- 시즌
- 내 정보
- 더보기

커뮤니티 세부탭:

- 최신글
- 인기글
- 댓글
- 노래추천
- 랜덤글

내 정보 세부탭:

- 프로필
- 칭호
- 꾸미기
- 상점
- 업적

더보기 세부항목:

- 알림
- 설정
- 관리자
- 로그아웃

관리자 메뉴는 로그인 사용자 role이 `admin` 또는 `owner`일 때만 JS 렌더링 단계에서 추가됩니다. 일반 유저에게는 관리자 링크를 렌더링하지 않습니다.

홈에 남기는 정보는 내 포인트, 대표 칭호, 출석, 최근 알림, 최근 글, 인기글, 시즌 칭호 요약처럼 빠르게 훑는 항목을 중심으로 둡니다. 전체 시즌 랭킹, 카지노 통계, 명예의 전당 전체, 세부 트로피, 전체 글/노래/알림/칭호 목록, 관리자 통계는 홈 초기 로딩 대상에서 점진적으로 제외할 계획입니다.

후속 작업:

- A-3: `/api/dashboard/summary` 또는 동등한 dashboard summary API 설계
- A-4: 홈 UI를 summary 응답 중심으로 적용
- A-5: 커뮤니티/카지노/시즌/내 정보 탭별 lazy load
- A-6: 캐시, 스켈레톤, 빈 상태 정리

용병단 출시 후 목표 탭 구조는 `홈 / 커뮤니티 / 카지노 / 용병단 / 시즌 / 더보기`입니다. 용병단 세부탭은 내 용병, 용병 사무소, 의뢰소, 편성, 훈련, 의무실, 전투 기록 방향으로 확장할 수 있습니다.

### V1.8.6-A-3 Dashboard Summary API

`GET /api/dashboard/summary`는 로그인 사용자의 홈 첫 화면을 위한 경량 요약 API입니다. 기존 `/api/dashboard`와 다른 API는 유지하며, A-4에서 홈 UI를 이 응답 중심으로 교체할 수 있도록 구조화된 데이터를 한 번에 내려줍니다.

인증:

- 로그인 사용자만 접근할 수 있습니다.
- 비로그인 요청은 기존 auth middleware 기준으로 `401`을 반환합니다.

포함 데이터:

- `me`: id, nickname, role, avatar/profile theme, 대표 칭호 badge 렌더링에 필요한 title 데이터
- `points`: balance, formattedBalance
- `attendance`: checkedToday, canCheckIn, todayReward
- `notifications`: unreadCount, 최근 알림 최대 3개
- `community.recentPosts`: 최근 글 최대 3개
- `community.popularPosts`: 인기글 최대 3개
- `season.currentSeason`: 현재 active season 요약
- `season.titleSummary`: 시즌 대표 칭호 4종 현재 1위 요약
- `season.mySeasonRewardTitles`: 내가 받은 시즌 대표 칭호 요약
- `dailyMissions`: 오늘 미션 요약

포함하지 않는 무거운 데이터:

- 전체 시즌 랭킹
- 전체 카지노 통계
- 전체 명예의 전당/트로피 기록
- 전체 게시글/노래추천/알림 목록
- 전체 칭호 목록
- 관리자 통계

인기글은 이번 단계에서 단순 기준을 사용합니다. 최근 7일 공개 글 중 숨김 글을 제외하고, 숨김 처리되지 않은 댓글 수를 기준으로 정렬합니다. `score`는 `commentCount * 5`로 내려주며, 조회수/좋아요가 도입되면 A-4 이후 점수식에 반영할 수 있습니다.

시즌 칭호 요약은 4개 대표 category만 사용합니다.

- `activity_score` → 시즌의 지배자
- `casino_loss` → 시즌 대참사
- `point_earned` → 포인트 위에 누운 자
- `community_activity` → 격리소 서기관

각 섹션은 독립적으로 조회되며, 알림/커뮤니티/시즌/일일 미션 같은 부가 섹션이 실패해도 summary 전체가 500이 되지 않도록 빈 fallback과 `error: true`를 반환합니다. 사용자 핵심 정보와 포인트 계정 조회가 실패하면 기존 방식대로 서버 오류로 처리합니다.

후속 단계:

- A-4: 홈 UI를 `/api/dashboard/summary` 기반으로 교체
- A-5: 커뮤니티/카지노/시즌/내 정보 탭별 lazy load
- A-6: 캐시, 스켈레톤, 빈 상태 정리

## MVP 1.6 칭호 개편

칭호는 이제 단순 텍스트가 아니라 rarity/category/source_type 기반 badge로 표시됩니다.

- rarity: `common`, `uncommon`, `rare`, `epic`, `legendary`, `event`, `admin`, `punishment`
- category: `shop`, `achievement`, `season`, `casino`, `activity`, `event`, `admin`, `punishment`, `legacy`
- source_type: `purchase`, `achievement`, `season_reward`, `admin_grant`, `event_reward`, `system_grant`, `legacy`

추가된 DB 필드:

- `titles.category`, `source_type`, `is_purchasable`, `is_reward_only`, `display_order`
- `titles.flavor_text`, `unlock_hint`, `css_class`, `icon`, `is_limited`, `starts_at`, `ends_at`
- `title_grants`: 관리자 지급/회수, 시즌 보상 지급, 이벤트 지급 로그

주요 API:

- `GET /api/shop/titles?rarity=&category=&sourceType=&purchasable=&owned=&q=`
- `GET /api/me/titles`
- `POST /api/me/title/equip`
- `POST /api/shop/titles/:id/buy`
- `POST /api/admin/users/:userId/titles/:titleId/grant`
- `POST /api/admin/users/:userId/titles/:titleId/revoke`

보상 전용 칭호는 `is_purchasable=false` 또는 `is_reward_only=true`로 관리하며 상점 구매가 차단됩니다. 관리자 지급은 포인트를 차감하지 않습니다. 회수한 칭호가 장착 중이면 남아 있는 첫 칭호 또는 기본 칭호 문자열로 자동 교체됩니다.

시즌 명예의 전당 생성/재생성 결과는 보상 preview의 기준이 됩니다. V1.8.5.1부터 `season_reward` 칭호 지급은 대표 category로 제한되고, 나머지 1위 기록은 프로필 트로피로만 남습니다. 중복 지급은 성공 응답과 함께 `alreadyOwned=true`로 처리됩니다.

공통 프런트 렌더러는 `public/js/titleBadge.js`의 `renderTitleBadge(title, options)`입니다. `css_class`는 서버와 클라이언트에서 안전한 class 문자만 통과시킵니다. 익명 게시글/댓글은 실제 작성자의 칭호를 노출하지 않습니다.

운영 Supabase에 MVP 1.6을 반영할 때도 아래 순서로 SQL을 다시 적용해야 합니다.

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`

## MVP 1.5 시즌 랭킹 / 명예의 전당

`/seasons.html`에서 현재 시즌의 실시간 랭킹과 종료된 시즌의 명예의 전당을 확인할 수 있습니다.

집계 카테고리:

- 활동 종합, 포인트 획득, 포인트 소비, 포인트 순증감
- 카지노 수익, 카지노 대참사, 카지노 플레이
- 게시글, 댓글, 노래추천, 일일 미션, 꾸미기 소비, 출석

공개 API:

- `GET /api/seasons`
- `GET /api/seasons?status=active`
- `GET /api/seasons/current`
- `GET /api/seasons/current/rankings`
- `GET /api/seasons/current/rankings/:category`
- `GET /api/seasons/:id/rankings?category=point_earned`
- `GET /api/seasons/:id/rankings/:category`
- `GET /api/seasons/hall-of-fame?seasonId=1&category=casino_loss`
- `GET /api/seasons/:id/hall-of-fame`
- `GET /api/me/season-summary`

관리자 API:

- `GET /api/admin/seasons`
- `POST /api/admin/seasons`
- `PATCH /api/admin/seasons/:id`
- `POST /api/admin/seasons/:id/activate`
- `POST /api/admin/seasons/:id/end`
- `GET /api/admin/seasons/:id/preview-rankings`
- `POST /api/admin/seasons/:id/generate-hall-of-fame`

시즌 종료 시 각 카테고리 top 3 기록을 `season_hall_of_fame`에 고정 저장합니다. 기록에는 표시 이름, 닉네임, 칭호, 아바타, 꾸미기 스냅샷이 포함되므로 이후 프로필이 바뀌어도 종료 시점의 표시를 유지할 수 있습니다.

초기 seed는 `season_1`을 활성 시즌으로 추가하지만, 기존 시즌을 덮어쓰지 않습니다. 활성 시즌은 동시에 하나만 허용됩니다. 운영 환경에서 MVP 1.5를 적용할 때 Supabase SQL Editor에서 다음 순서로 다시 실행하세요.

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

- 익명 노래추천은 기본 `3 P`를 사용합니다.
- 노래추천 작성 보상은 기본 `5 P`, 하루 `3회`까지입니다.
- 로그인 사용자의 랜덤 노래 조회 보상은 기본 `1 P`, 하루 `1회`까지입니다.
- 오늘의 노래는 KST 날짜를 seed로 사용해 같은 날에는 동일한 추천을 반환합니다.
- 익명 추천은 공개 API에서 작성자 ID와 실제 작성자를 노출하지 않습니다. 관리자 API에서만 확인할 수 있습니다.

dashboard의 `오늘의 관찰 과제` 카드에서 KST 기준 일일 미션 진행 상태와 보상, 보너스를 확인할 수 있습니다. 출석, 게시글, 댓글, 랜덤 게시글, 노래추천, 랜덤 노래, 카지노 플레이가 미션에 반영됩니다. 보상은 `/api/missions/daily/:missionCode/claim`, 보너스는 `/api/missions/daily/bonus/:bonusCode/claim`에서 한 번만 지급됩니다.

기존 Supabase 프로젝트에는 새 테이블과 미션 보상 RPC가 필요합니다. SQL Editor에서 다음 순서로 다시 실행하세요.

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`
## V1.7 카지노 기록 / 대참사 박제 시스템

카지노 결과를 시즌 기록으로 남기기 위해 다음 테이블을 추가했습니다.

- `season_user_point_peaks`: 시즌별 유저 최고 보유 포인트, 현재 잔고 스냅샷, 추락폭, 추락률
- `casino_user_stats`: 시즌/유저/게임별 플레이 수, 총 베팅, 총 지급, 순손익, 단일 최대 승리/손실
- `casino_events`: jackpot, disaster, peak_balance, drawdown, suspicious_loop 같은 공개/관리자 사건 기록

핵심 지표:

- `balance_peak`: 시즌 중 최고 보유 포인트
- `drawdown`: 최고점 대비 현재 잔고 하락폭
- `drawdown_rate`: 최고점 대비 하락률
- `casino_net_profit`, `casino_net_loss`: 카지노 전체 순손익 기준 랭킹
- `biggest_casino_win`, `biggest_casino_loss`: 단일 카지노 결과 최대 승리/손실
- `point_turnover`: 시즌 소비 포인트 / 시즌 획득 포인트
- `russian_cashout_count`: 러시안 룰렛 2발 캐시아웃 반복 관측
- `blackjack_profit`: 주사위 블랙잭 순수익

추가 API:

- `GET /api/casino/stats/me`
- `GET /api/casino/stats/leaderboard?category=drawdown`
- `GET /api/casino/events`
- `GET /api/me/casino-summary`
- `GET /api/admin/casino/stats`
- `GET /api/admin/casino/game-stats`
- `GET /api/admin/casino/user-stats/:userId`
- `GET /api/admin/casino/suspicious-loops`
- `POST /api/admin/casino/rebuild-stats`

관리자 통계에서는 게임별 총 베팅/지급/net, 환급률, 유저별 순손익, 단일 최대 승리/손실, 러시안 룰렛 2발 캐시아웃 후보를 볼 수 있습니다. `rebuild-stats`는 운영 DB에서 무거울 수 있으므로 기본적으로 `dryRun: true`로 먼저 실행하세요.

Supabase 운영 DB 적용 순서:

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`

## V1.7.1 카지노 밸런스 정상화

V1.7.1은 V1.7 통계에서 확인된 과도한 유저 우세를 낮추되, 최대 베팅 제한은 추가하지 않고 대박 가능성은 유지하는 밸런스 조정입니다.

목표 환급률:

- 전체 카지노: 90~96%
- 주사위 블랙잭: 92~97%
- 러시안 룰렛: 85~93%

러시안 룰렛은 참가비 `30 P` 고정이며 캐시아웃 보상표는 아래와 같습니다.

| 생존 단계 | 지급 | 순이익 |
| ---: | ---: | ---: |
| 1회 | `32 P` | `+2 P` |
| 2회 | `38 P` | `+8 P` |
| 3회 | `58 P` | `+28 P` |
| 4회 | `105 P` | `+75 P` |
| 5회 | `210 P` | `+180 P` |

2발 캐시아웃 반복은 기대값이 음수가 되도록 낮췄고, 4~5발은 고위험 고보상 구조를 유지합니다. 관리자 카지노 통계에서는 cashout step별 플레이 수, 캐시아웃/실패 수, 총 베팅, 총 지급, net, 환급률, 성공률을 확인할 수 있습니다.

주사위 블랙잭은 일반 승리 `1.85x`, 정확히 21 승리 `2.15x`, 동점 push `1x`로 조정했습니다. 딜러는 16 이하에서 반드시 추가 굴림, 17 이상에서 스탠드합니다.

관리자 카지노 통계의 Net은 유저 기준과 카지노 기준을 함께 표시합니다. 환급률 상태는 `유저 유리 / 즉시 조정 필요`, `유저 약우세 / 관측 필요`, `정상`, `카지노 강세 / 너무 짤 수 있음`, `과도한 너프 위험`으로 구분합니다.

운영 후 최소 50~100회 이상 데이터가 쌓이면 관리자 통계에서 환급률을 재확인하세요. 러시안 룰렛이 100% 이상이면 1~2발 보상 추가 조정, 블랙잭이 100% 이상이면 일반 승리 배율을 `1.85x` 아래로 낮추는 후속 검토가 필요합니다. 전체 환급률이 85% 아래로 떨어지면 너무 짠 상태일 수 있습니다.

## V1.8 알림 센터

V1.8은 브라우저 푸시나 Socket.IO 없이 사이트 내부에서 확인하는 인앱 알림 센터입니다. `/notifications.html`에서 댓글, 멘션, 칭호, 시즌, 카지노 사건, 관리자 공지를 확인하고 읽음/전체 읽음/삭제 처리를 할 수 있습니다.

새 테이블:

- `notifications`: 수신자, 발생자, 타입, 중요도, 제목, 메시지, 이동 대상, metadata, 읽음/삭제 상태를 저장합니다.

알림 타입:

- `post_new`, `post_comment`, `comment_reply`, `mention`
- `title_granted`, `title_revoked`
- `season_rank`, `season_hall_of_fame`
- `casino_jackpot`, `casino_disaster`, `casino_drawdown`
- `admin_notice`, `system_notice`, `event_notice`

중요도:

- `low`, `normal`, `high`, `critical`

생성 조건:

- notice 카테고리 또는 관리자/owner 작성 공지글은 전체 유저에게 새 글 알림을 보냅니다.
- 내 게시글에 다른 사람이 댓글을 달면 `post_comment` 알림을 보냅니다.
- 게시글/댓글 본문에서 `@닉네임`을 감지하면 대상 유저에게 `mention` 알림을 보냅니다.
- 칭호 구매, 관리자 지급, 시즌 보상 지급, 칭호 회수는 칭호 알림을 보냅니다.
- 시즌 종료 또는 명예의 전당 재생성 시 TOP 3 대상자에게 시즌/명예의 전당 알림을 보냅니다.
- V1.7 카지노 이벤트 중 jackpot, disaster, drawdown은 당사자에게 개인 알림을 보냅니다.
- 관리자 패널의 알림 발송 섹션에서 특정 유저 또는 전체 유저에게 공지를 보낼 수 있습니다.

익명 처리:

- 익명 게시글/댓글의 멘션과 댓글 알림은 메시지와 actor 응답에서 `익명`으로 표시합니다.
- 알림 공개 응답에는 익명 작성자의 실제 닉네임, 칭호, 아바타를 내려주지 않습니다.

지원하지 않는 것:

- 브라우저 푸시 알림
- Service Worker / Web Push subscription
- Socket.IO 실시간 알림
- 이메일 알림
- DM/쪽지 시스템

Supabase 운영 DB 적용 순서:

1. `database/supabase.schema.sql`
2. `database/supabase.seed.sql`
3. `database/supabase.rpc.sql`

적용 후 `npm.cmd run test:smoke:supabase`로 provider-safe 동작과 cleanup을 확인하세요.

## V1.8.6-A-4 Home Summary UI

Home now uses `GET /api/dashboard/summary` as the first authenticated dashboard request. The first render is built from the summary payload instead of separately loading the legacy dashboard bundle, daily missions, notification preview, recent posts, popular posts, and season title preview.

Home renders only lightweight entrance data:

- my profile summary, equipped title, point balance, and attendance state
- daily mission summary
- unread notification count and recent notifications
- recent posts up to 3
- popular posts up to 3
- current season title summary up to 4
- my representative season reward titles

Home intentionally does not load full season rankings, hall of fame lists, trophy details, casino statistics, full notification lists, full post/song/title/shop lists, or admin statistics. Those remain available through their existing pages and APIs, and the next pass should move tab details into lazy-loaded sections.

Dashboard performance logging can confirm the lighter startup path:

```js
localStorage.DEBUG_DASHBOARD = 'true';
location.reload();
```

Expected A-4 startup shape:

- `[dashboard] api GET /api/dashboard/summary ...`
- `[dashboard] render home summary ...`
- `[dashboard] init total ...`
- `[dashboard] initial api count 1`

If the summary request fails, the home page shows a retry card instead of a blank page. Attendance and mission reward buttons still use the existing action APIs, then refresh the summary after success.
