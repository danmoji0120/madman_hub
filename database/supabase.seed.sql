INSERT INTO titles (name, description, price, rarity) VALUES
  ('신규 격리 대상', '처음부터 주어지는 기본 칭호', 0, 'common'),
  ('공식 미친놈', '출석을 몇 번만 해도 살 수 있는 기본 장난감 칭호', 50, 'uncommon'),
  ('새벽의 망령', '새벽에 살아나는 자들을 위한 칭호', 120, 'rare'),
  ('버그 소환사', '만지기만 하면 뭐가 꼬이는 사람', 150, 'rare'),
  ('혼돈 총괄자', '질서를 만들겠다고 하다가 혼돈을 만든 자', 300, 'epic'),
  ('출석은 했습니다', '일단 출석 버튼은 눌렀습니다', 30, 'common'),
  ('새로고침의 달인', '문제가 생기면 먼저 새로고침부터 하는 사람', 70, 'uncommon'),
  ('야근 승인 대기중', '퇴근 버튼을 찾지 못한 사람', 90, 'uncommon'),
  ('회의실 탈주범', '회의 종료보다 빠르게 사라지는 사람', 110, 'uncommon'),
  ('새벽 배포 목격자', '모두가 잠든 시간의 배포를 기억하는 사람', 180, 'rare'),
  ('로그 수집가', '에러 로그를 모아 사건을 재구성하는 사람', 200, 'rare'),
  ('캐시 삭제 전문가', '일단 캐시를 지우고 생각하는 사람', 220, 'rare'),
  ('404 길잡이', '없는 길에서도 링크를 찾아내는 사람', 240, 'rare'),
  ('운영 반영 기도단', '배포 직후 조용히 새로고침하는 사람', 260, 'rare'),
  ('테스트 통과 예언자', '테스트가 초록색이 될 때까지 지켜보는 사람', 320, 'epic'),
  ('롤백 준비 완료', '버튼 하나로 시간을 되돌릴 준비가 된 사람', 350, 'epic'),
  ('포인트 채굴 금지', '카지노 기록을 너무 열심히 확인한 사람', 380, 'epic'),
  ('읽씹 방지 위원회', '게시글과 방명록을 빠짐없이 확인하는 사람', 400, 'epic'),
  ('전설의 탭 수집가', '브라우저 탭을 닫지 못하는 사람', 450, 'epic'),
  ('격리소 야간반장', '새벽 시간대의 격리소를 지키는 사람', 500, 'epic'),
  ('무중단 배포 생존자', '서비스를 지키며 배포를 끝낸 사람', 650, 'legendary'),
  ('최종 보스 아닌 사람', '평범하다고 주장하지만 아무도 믿지 않는 사람', 800, 'legendary'),
  ('새벽 네 시의 증인', '아무도 묻지 않았지만 모든 것을 본 사람', 1000, 'legendary'),
  ('격리소 관리자', '관리자용 칭호', 0, 'admin')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_titles (user_id, title_id, source)
SELECT u.id, t.id, 'default'
FROM users u
JOIN titles t ON t.name = '신규 격리 대상'
ON CONFLICT (user_id, title_id) DO NOTHING;

INSERT INTO cosmetic_items (code, name, description, type, rarity, price, css_class, preview_text) VALUES
  ('default_frame', '기본 테두리', '차분한 기본 프로필 테두리', 'profile_frame', 'common', 0, 'cosmetic-frame-default', '기본'),
  ('neon_frame', '네온 테두리', '은은하게 빛나는 네온 프로필 테두리', 'profile_frame', 'rare', 500, 'cosmetic-frame-neon', 'NEON'),
  ('casino_gold_frame', '카지노 골드 테두리', '카지노 테이블의 금빛을 담은 테두리', 'profile_frame', 'epic', 1500, 'cosmetic-frame-casino-gold', 'GOLD'),
  ('bb_monitor_frame', 'BB챗 감시 테두리', '감시 화면처럼 선명한 전설 테두리', 'profile_frame', 'legendary', 10000, 'cosmetic-frame-bb-monitor', 'MONITOR'),
  ('default_profile_bg', '기본 배경', '기본 프로필 카드 배경', 'profile_background', 'common', 0, 'cosmetic-bg-default', 'DEFAULT'),
  ('isolation_room_bg', '격리실 배경', '고요한 격리실 분위기의 배경', 'profile_background', 'rare', 700, 'cosmetic-bg-isolation-room', 'ROOM'),
  ('casino_table_bg', '카지노 테이블 배경', '카지노 테이블을 닮은 배경', 'profile_background', 'epic', 1800, 'cosmetic-bg-casino-table', 'TABLE'),
  ('abyss_neon_bg', '심연의 네온 배경', '깊은 심연에서 번지는 네온 배경', 'profile_background', 'legendary', 8000, 'cosmetic-bg-abyss-neon', 'ABYSS'),
  ('default_name', '기본 닉네임', '기본 닉네임 색상', 'nickname_color', 'common', 0, 'cosmetic-name-default', 'NAME'),
  ('blue_name', '파란 닉네임', '선명한 파란색 닉네임', 'nickname_color', 'rare', 500, 'cosmetic-name-blue', 'BLUE'),
  ('purple_name', '보라 닉네임', '네온 보라색 닉네임', 'nickname_color', 'rare', 800, 'cosmetic-name-purple', 'PURPLE'),
  ('gold_name', '금색 닉네임', '금빛 닉네임', 'nickname_color', 'epic', 3000, 'cosmetic-name-gold', 'GOLD'),
  ('danger_red_name', '위험 등급 레드', '위험 표지처럼 붉은 닉네임', 'nickname_color', 'epic', 3500, 'cosmetic-name-danger-red', 'DANGER')
ON CONFLICT (code) DO NOTHING;

INSERT INTO achievements (code, name, description, category, reward_points) VALUES
  ('FIRST_CHECKIN', '첫 출석', '처음으로 출석했습니다.', 'checkin', 5),
  ('FIRST_GUESTBOOK', '첫 방명록', '처음으로 방명록을 남겼습니다.', 'social', 5),
  ('FIRST_POST', '첫 게시글', '처음으로 게시글을 작성했습니다.', 'board', 5),
  ('FIRST_TITLE_PURCHASE', '첫 칭호 구매', '처음으로 칭호를 구매했습니다.', 'shop', 10),
  ('POINT_100', '100P 달성', '포인트 잔액 100P를 달성했습니다.', 'points', 10),
  ('POST_5', '글 좀 쓰는 사람', '게시글을 5개 작성했습니다.', 'board', 20),
  ('CHECKIN_3', '3회 출석', '총 3회 출석했습니다.', 'checkin', 20),
  ('CASINO_FIRST_BET', '첫 베팅', '카지노에서 처음으로 포인트를 걸었습니다.', 'casino', 5),
  ('CASINO_FIRST_WIN', '첫 승리', '카지노에서 처음으로 수익을 냈습니다.', 'casino', 10),
  ('CASINO_FIRST_LOSS', '첫 손실', '카지노에서 처음으로 포인트를 잃었습니다.', 'casino', 5),
  ('ROULETTE_JACKPOT', '룰렛 잭팟', '룰렛에서 20x를 뽑았습니다.', 'casino', 50),
  ('BLACKJACK_21', '완벽한 21', '주사위 블랙잭에서 21로 승리했습니다.', 'casino', 30),
  ('CRASH_5X', '크래시 탈출자', '크래시 게임에서 5x 이상으로 탈출했습니다.', 'casino', 30),
  ('CRASH_20X', '크래시 전설', '크래시 게임에서 20x 이상으로 탈출했습니다.', 'casino', 100),
  ('RUSSIAN_MAX_SURVIVE', '방아쇠 생존자', '러시안 룰렛에서 5회 생존했습니다.', 'casino', 50),
  ('CASINO_BIG_LOSS', '아름다운 파산', '카지노에서 한 번에 100P 이상 잃었습니다.', 'casino', 10),
  ('CASINO_BIG_WIN', '운빨의 화신', '카지노에서 한 번에 순수익 200P 이상을 냈습니다.', 'casino', 30),
  ('COMMENT_FIRST', '첫 댓글', '처음으로 댓글을 작성했습니다.', 'board', 5),
  ('ANONYMOUS_FIRST', '익명의 첫걸음', '처음으로 익명 게시글 또는 익명 댓글을 작성했습니다.', 'board', 5),
  ('SONG_FIRST_RECOMMEND', '첫 노래추천', '처음으로 노래를 추천했습니다.', 'songs', 5),
  ('DAILY_MISSION_FIRST', '첫 일일 미션', '처음으로 일일 미션 보상을 받았습니다.', 'missions', 5),
  ('DAILY_MISSION_ALL', '오늘의 관찰 완료', '하루의 모든 일일 미션을 완료했습니다.', 'missions', 15)
ON CONFLICT (code) DO NOTHING;

INSERT INTO seasons (code, name, description, starts_at, ends_at, status, is_active)
VALUES (
  'season_1',
  '시즌 1 - 격리소 개장전',
  'MADMEN HUB 첫 시즌',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '29 days',
  'active',
  TRUE
)
ON CONFLICT DO NOTHING;
