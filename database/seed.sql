INSERT OR IGNORE INTO titles (name, description, price, rarity) VALUES
  ('신규 격리 대상', '처음부터 주어지는 기본 칭호', 0, 'common'),
  ('공식 미친놈', '출석을 몇 번만 해도 살 수 있는 기본 장난감 칭호', 50, 'uncommon'),
  ('새벽의 망령', '새벽에 살아나는 자들을 위한 칭호', 120, 'rare'),
  ('버그 소환사', '만지기만 하면 뭐가 꼬이는 사람', 150, 'rare'),
  ('혼돈 총괄자', '질서를 만들겠다고 하다가 혼돈을 만든 자', 300, 'epic'),
  ('격리소 관리자', '관리자용 칭호', 0, 'admin');

INSERT OR IGNORE INTO user_titles (user_id, title_id, source)
SELECT u.id, t.id, 'default'
FROM users u
JOIN titles t ON t.name = '신규 격리 대상';

INSERT OR IGNORE INTO achievements (code, name, description, category, reward_points) VALUES
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
  ('CASINO_BIG_WIN', '운빨의 화신', '카지노에서 한 번에 순수익 200P 이상을 냈습니다.', 'casino', 30);
