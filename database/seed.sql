INSERT OR IGNORE INTO titles (name, description, price, rarity) VALUES
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
  ('격리소 관리자', '관리자용 칭호', 0, 'admin');

INSERT OR IGNORE INTO user_titles (user_id, title_id, source)
SELECT u.id, t.id, 'default'
FROM users u
JOIN titles t ON t.name = '신규 격리 대상';

DELETE FROM titles
WHERE name LIKE 'MVP16 %'
  AND id NOT IN (SELECT title_id FROM user_titles);

WITH title_seed(
  name, description, price, rarity, category, source_type, is_purchasable, is_reward_only,
  display_order, flavor_text, unlock_hint, css_class, icon, is_limited
) AS (
  VALUES
    ('초보 실험체', '격리소 첫 출입자를 위한 기본형 상점 칭호', 100, 'common', 'shop', 'purchase', 1, 0, 101, '이름표는 새것이지만 이미 살짝 흔들리고 있다.', '칭호 상점에서 구매', 'title-concept-common', '', 0),
    ('관찰 대상', '아직은 평범하지만 기록은 이미 시작됐다.', 150, 'common', 'shop', 'purchase', 1, 0, 102, '누군가의 체크리스트 맨 위에 올라간 기분.', '칭호 상점에서 구매', 'title-concept-common', '', 0),
    ('경고 보호막', '경고문을 갑옷처럼 두른 조심성 많은 이용자.', 200, 'common', 'shop', 'purchase', 1, 0, 103, '위험하지 않다. 아마도.', '칭호 상점에서 구매', 'title-concept-common', '', 0),
    ('오늘의 생존자', '하루를 무사히 넘긴 사람에게 어울리는 작은 표식.', 250, 'common', 'activity', 'purchase', 1, 0, 104, '대단한 승리는 아니어도 기록할 만한 생존이다.', '칭호 상점에서 구매', 'title-concept-common', '', 0),
    ('댓글 점화자', '조용한 글에도 불씨 하나를 던지는 사람.', 500, 'uncommon', 'activity', 'purchase', 1, 0, 201, '한 줄이면 충분하다. 분위기가 달라진다.', '댓글 활동 또는 칭호 상점', 'title-concept-uncommon', '', 0),
    ('소음 큐레이터', '묻지도 않았는데 좋은 노래를 들고 오는 사람.', 600, 'uncommon', 'activity', 'purchase', 1, 0, 202, '플레이리스트가 길수록 변명도 길어진다.', '노래 추천 활동 또는 칭호 상점', 'title-concept-uncommon', '', 0),
    ('칩 한 줌의 용기', '작게 걸고 크게 떨리는 카지노 입문자.', 700, 'uncommon', 'casino', 'purchase', 1, 0, 203, '손에 쥔 칩보다 표정이 더 비싸다.', '카지노 활동 또는 칭호 상점', 'title-concept-uncommon', '', 0),
    ('격리실 산책자', '방문 기록이 산책 코스처럼 자연스러운 사람.', 800, 'uncommon', 'activity', 'purchase', 1, 0, 204, '나갈 길은 몰라도 돌아오는 길은 안다.', '출석 또는 활동 보상', 'title-concept-uncommon', '', 0),
    ('네온 잔상', '빠르게 지나가도 화면에 색이 남는 칭호.', 1500, 'rare', 'shop', 'purchase', 1, 0, 301, '빛난다기보다 오래 어른거린다.', '칭호 상점에서 구매', 'title-concept-rare', '', 0),
    ('카지노 생존자', '잃었지만 살아남았고, 살아남았으니 또 들어간다.', 1800, 'rare', 'casino', 'purchase', 1, 0, 302, '승리는 아니지만 퇴장은 아니다.', '카지노 활동 또는 칭호 상점', 'title-concept-rare', '', 0),
    ('포인트 수집광', '보이는 보상은 일단 주워 담는 사람.', 2000, 'rare', 'shop', 'purchase', 1, 0, 303, '통장이 아니라 점수판을 믿는다.', '칭호 상점에서 구매', 'title-concept-rare', '', 0),
    ('기록 보관관', '모든 소란을 기록으로 남기는 격리소의 서기.', 2200, 'rare', 'activity', 'purchase', 1, 0, 304, '기억은 흐려져도 로그는 남는다.', '게시글/댓글 활동 또는 칭호 상점', 'title-concept-rare', '', 0),
    ('가성비 파산왕', '싸게 잃는 법을 누구보다 성실히 연구했다.', 4000, 'epic', 'casino', 'purchase', 1, 0, 401, '손실도 전략처럼 말하면 조금 덜 아프다.', '카지노 활동 또는 칭호 상점', 'title-concept-epic', '', 0),
    ('카지노 망령', '나갔다고 생각했지만 버튼 앞에 다시 서 있다.', 4500, 'epic', 'casino', 'purchase', 1, 0, 402, '테이블 위에 미련이 떠다닌다.', '카지노 활동 또는 칭호 상점', 'title-concept-epic', '', 0),
    ('댓글 빌런', '대화의 흐름을 기묘하게 풍성하게 만드는 사람.', 3500, 'epic', 'activity', 'purchase', 1, 0, 403, '문제는 없지만 모두가 한 번 더 읽는다.', '댓글 활동 또는 칭호 상점', 'title-concept-epic', '', 0),
    ('상점의 후원자', '필요해서 산 것이 아니라 보여주기 위해 샀다.', 5000, 'epic', 'shop', 'purchase', 1, 0, 404, '소비는 취향의 가장 시끄러운 증거다.', '칭호 상점에서 구매', 'title-concept-epic', '', 0),
    ('시즌 포인트 베개', '포인트 획득 기록 위에 편히 누운 시즌 우승자.', 0, 'epic', 'season', 'season_reward', 0, 1, 501, '이번 시즌만큼은 숫자가 푹신했다.', '시즌 point_earned 1위 보상', 'title-concept-epic', '*', 0),
    ('시즌 파산왕', '가장 화려하게 쓴 사람에게 남는 이상한 영광.', 0, 'epic', 'season', 'season_reward', 0, 1, 502, '잔고는 가벼워졌고 이름은 무거워졌다.', '시즌 point_spent 1위 보상', 'title-concept-epic', '*', 0),
    ('시즌 대참사', '손실도 기록이 되면 전설처럼 보인다.', 0, 'legendary', 'season', 'season_reward', 0, 1, 503, '이건 실패가 아니라 박제된 낙하산이다.', '시즌 casino_loss 1위 보상', 'title-concept-legendary', '*', 0),
    ('돈은 머무르지 않았다', '최고점은 있었고 지금은 전시만 남았다.', 0, 'epic', 'season', 'season_reward', 0, 1, 509, '최고점은 있었고, 지금은 없습니다.', '시즌 최고점 추락 1위 보상', 'title-concept-epic', '!', 0),
    ('시즌 소각왕', '포인트를 가장 뜨겁게 태운 시즌 기록자.', 0, 'epic', 'season', 'season_reward', 0, 1, 510, '번 돈보다 태운 돈이 더 아름다웠습니다.', '시즌 포인트 소비 1위 보상', 'title-concept-epic', '*', 0),
    ('격리소 서기관', '격리소의 광기를 가장 성실하게 기록한 사람.', 0, 'rare', 'season', 'season_reward', 0, 1, 511, '격리소의 광기는 기록으로 완성됩니다.', '시즌 댓글 활동 1위 보상', 'title-concept-rare', '*', 0),
    ('시즌 댓글왕', '한 시즌의 빈칸을 말풍선으로 채운 사람.', 0, 'rare', 'season', 'season_reward', 0, 1, 504, '조용한 글도 이 사람을 만나면 대화가 된다.', '시즌 comment_count 1위 보상', 'title-concept-rare', '*', 0),
    ('시즌 플레이리스트 DJ', '격리소의 배경음악을 책임진 시즌 추천왕.', 0, 'rare', 'season', 'season_reward', 0, 1, 505, '모두가 듣지는 않았지만 모두가 봤다.', '시즌 song_count 1위 보상', 'title-concept-rare', '*', 0),
    ('시즌 꾸미기 중독자', '프로필보다 결제 내역이 더 반짝인 시즌 소비자.', 0, 'epic', 'season', 'season_reward', 0, 1, 506, '취향은 숫자로도 증명된다.', '시즌 cosmetic_spent 1위 보상', 'title-concept-epic', '*', 0),
    ('시즌의 지배자', '한 시즌 동안 격리소의 시선을 붙잡은 사람.', 0, 'legendary', 'season', 'season_reward', 0, 1, 507, '기록표가 잠깐 왕좌처럼 보였다.', '시즌 activity_score 1위 보상', 'title-concept-legendary', '*', 0),
    ('30000P의 꿈', '천국을 보고 지옥에 주차한 카지노 기록.', 0, 'legendary', 'casino', 'season_reward', 0, 1, 508, '꿈은 컸고 그래프는 더 크게 흔들렸다.', '시즌 casino_profit 1위 또는 특수 카지노 보상', 'title-concept-legendary', '*', 0),
    ('한탕의 부스러기', '분명 뭔가 많았는데 지금은 흔적만 남았다.', 0, 'epic', 'casino', 'system_grant', 0, 1, 601, '이득의 냄새는 오래가고 포인트는 빨리 간다.', '특수 카지노 기록 보상', 'title-concept-epic', '!', 0),
    ('럭키한 불운아', '운이 좋았는지 나빴는지 아직도 결론이 없다.', 0, 'rare', 'casino', 'achievement', 0, 1, 602, '웃으면서 잃으면 그건 재능일까.', '카지노 업적 보상', 'title-concept-rare', '!', 0),
    ('내리막의 품격', '떨어지는 중에도 자세만큼은 흔들리지 않았다.', 0, 'epic', 'casino', 'season_reward', 0, 1, 603, '낙하는 빠르고 변명은 길다.', '시즌 카지노 손실 기록 보상', 'title-concept-epic', '!', 0),
    ('로그가 울고 있다', '시스템도 한 번쯤은 말리고 싶었던 기록.', 0, 'uncommon', 'casino', 'achievement', 0, 1, 604, '기록은 정직했고 결과는 잔인했다.', '카지노 업적 보상', 'title-concept-uncommon', '!', 0),
    ('주사위 피해자', '주사위는 굴렀고 책임은 유저에게 남았다.', 0, 'rare', 'casino', 'achievement', 0, 1, 605, '확률은 중립이고 체감은 배신자다.', '카지노 업적 보상', 'title-concept-rare', '!', 0),
    ('관리자 장난감', '운영자의 마우스 끝에서 굴러가는 칭호.', 0, 'admin', 'admin', 'admin_grant', 0, 1, 701, '권한은 무겁고 장난은 가볍다.', '관리자 수동 지급', 'title-concept-admin', '!', 0),
    ('격리 실패 개체', '격리 절차가 실패했음을 알리는 노란 경고판.', 0, 'punishment', 'punishment', 'admin_grant', 0, 1, 702, '주의: 본인이 원인일 가능성이 높다.', '관리자 수동 지급', 'title-concept-punishment', '!', 0),
    ('반성문 제출자', '기록은 길었고 사과문은 더 길었다.', 0, 'punishment', 'punishment', 'admin_grant', 0, 1, 703, '반성은 했지만 로그는 남았다.', '관리자 수동 지급', 'title-concept-punishment', '!', 0),
    ('감시실의 단골', '관리자 화면에서 자주 마주치는 익숙한 이름.', 0, 'admin', 'admin', 'admin_grant', 0, 1, 704, '관심은 사랑이 아니지만 기록은 확실하다.', '관리자 수동 지급', 'title-concept-admin', '!', 0),
    ('영구 박제 후보', '아직 박제는 아니지만 액자는 준비됐다.', 0, 'punishment', 'punishment', 'admin_grant', 0, 1, 705, '조금만 더 하면 전설이 아니라 경고문이 된다.', '관리자 수동 지급', 'title-concept-punishment', '!', 0),
    ('댓글로 불타는 자', '댓글 하나로 방의 온도를 올리는 활동가.', 0, 'rare', 'activity', 'achievement', 0, 1, 801, '불씨는 작아도 알림은 길다.', '댓글 업적 보상', 'title-concept-rare', '', 0),
    ('게시판 정리병', '혼돈의 게시판에도 자기만의 분류표가 있다.', 0, 'rare', 'activity', 'achievement', 0, 1, 802, '정리는 습관이고 글은 증거다.', '게시글 업적 보상', 'title-concept-rare', '', 0),
    ('플레이리스트 망령', '추천은 끝났지만 노래는 계속 남아 있다.', 0, 'uncommon', 'activity', 'achievement', 0, 1, 803, '재생목록 어딘가에서 아직도 떠돈다.', '노래 추천 업적 보상', 'title-concept-uncommon', '', 0),
    ('새벽 감성러', '새벽에만 납득되는 문장과 노래를 남긴 사람.', 0, 'rare', 'activity', 'achievement', 0, 1, 804, '아침에 보면 조금 민망한 것이 진짜 감성이다.', '야간 활동 또는 노래 추천 업적 보상', 'title-concept-rare', '', 0),
    ('출석을 잊지 않는 자', '출석 버튼과 은근히 깊은 신뢰를 쌓았다.', 0, 'uncommon', 'activity', 'achievement', 0, 1, 805, '꾸준함은 가장 조용한 광기다.', '연속 출석 업적 보상', 'title-concept-uncommon', '', 0),
    ('일일미션 착각왕', '오늘 할 일을 다 했다고 믿고 싶은 사람.', 0, 'epic', 'activity', 'achievement', 0, 1, 806, '완료 체크는 마음속에서 먼저 일어난다.', '일일 미션 업적 보상', 'title-concept-epic', '', 0),
    ('이벤트 생존 증거', '이벤트가 지나간 뒤에도 남은 작은 네온 표식.', 0, 'event', 'event', 'event_reward', 0, 1, 901, '그때 있었다는 사실만으로도 충분하다.', '이벤트 보상', 'title-concept-event', '!', 1),
    ('한정판 소문꾼', '이벤트보다 이벤트 이야기를 더 오래 남긴 사람.', 0, 'event', 'event', 'event_reward', 0, 1, 902, '기간은 짧았고 소문은 길었다.', '이벤트 보상', 'title-concept-event', '!', 1)
)
INSERT INTO titles (
  name, description, price, rarity, category, source_type, is_purchasable, is_reward_only,
  display_order, flavor_text, unlock_hint, css_class, icon, is_limited
)
SELECT name, description, price, rarity, category, source_type, is_purchasable, is_reward_only,
       display_order, flavor_text, unlock_hint, css_class, icon, is_limited
FROM title_seed
WHERE true
ON CONFLICT(name) DO UPDATE SET
  description = excluded.description,
  price = excluded.price,
  rarity = excluded.rarity,
  category = excluded.category,
  source_type = excluded.source_type,
  is_purchasable = excluded.is_purchasable,
  is_reward_only = excluded.is_reward_only,
  display_order = excluded.display_order,
  flavor_text = excluded.flavor_text,
  unlock_hint = excluded.unlock_hint,
  css_class = excluded.css_class,
  icon = excluded.icon,
  is_limited = excluded.is_limited,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO titles (
  name, description, price, rarity, category, source_type, is_purchasable, is_reward_only,
  display_order, flavor_text, unlock_hint, css_class, icon, season_style, is_limited, is_active
) VALUES
  ('시즌의 지배자', '시즌 전체 활동 종합 1위에게 지급되는 대표 시즌 칭호', 0, 'legendary', 'season', 'season_reward', 0, 1, 507, '한 시즌 동안 격리소의 모든 시선을 빼앗은 자.', '시즌 활동 종합 1위 보상', 'title-concept-legendary', '*', 'dominator', 0, 1),
  ('시즌 대참사', '시즌 카지노 손실 1위에게 지급되는 대참사 박제 칭호', 0, 'legendary', 'season', 'season_reward', 0, 1, 503, '이 기록은 위로가 아니라 전시물입니다.', '시즌 카지노 손실 1위 보상', 'title-concept-legendary', '!', 'disaster', 0, 1),
  ('포인트 위에 누운 자', '시즌 중 가장 많은 포인트를 벌어들인 유저에게 지급되는 시즌 칭호', 0, 'epic', 'season', 'season_reward', 0, 1, 501, '벌어들인 숫자가 잠깐 침대가 되었습니다.', '시즌 포인트 수입 1위 보상', 'title-concept-epic', '*', 'fortune', 0, 1),
  ('격리소 서기관', '글, 댓글, 노래추천을 합산한 커뮤니티 활동 1위에게 지급되는 시즌 칭호', 0, 'epic', 'season', 'season_reward', 0, 1, 511, '격리소의 광기는 기록으로 완성됩니다.', '시즌 커뮤니티 활동 1위 보상', 'title-concept-epic', '*', 'archivist', 0, 1)
ON CONFLICT(name) DO UPDATE SET
  description = excluded.description,
  price = excluded.price,
  rarity = excluded.rarity,
  category = excluded.category,
  source_type = excluded.source_type,
  is_purchasable = excluded.is_purchasable,
  is_reward_only = excluded.is_reward_only,
  display_order = excluded.display_order,
  flavor_text = excluded.flavor_text,
  unlock_hint = excluded.unlock_hint,
  css_class = excluded.css_class,
  icon = excluded.icon,
  season_style = excluded.season_style,
  is_limited = excluded.is_limited,
  is_active = excluded.is_active,
  updated_at = CURRENT_TIMESTAMP;

UPDATE titles
SET category = 'casino', source_type = 'event_reward', updated_at = CURRENT_TIMESTAMP
WHERE name IN ('30000P의 꿈', '돈은 머무르지 않았다', '내리막의 품격', '카지노 생존자', '딜러의 장난감', '잔고 통과 의례');

UPDATE titles
SET is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE name IN ('시즌 소각왕', '시즌 파산왕', '시즌 포인트 베개', '시즌 꾸미기 중독자', '시즌 플레이리스트 DJ');

UPDATE titles
SET category = 'admin', source_type = 'admin_grant', is_purchasable = 0, is_reward_only = 1
WHERE rarity = 'admin';

UPDATE season_reward_mappings SET is_active = 0;

INSERT INTO season_reward_mappings (category, rank_min, rank_max, title_id, reward_type, is_active, description)
SELECT 'activity_score', 1, 1, id, 'title', 1, '대표 시즌 칭호: 활동 종합 1위' FROM titles WHERE name = '시즌의 지배자'
ON CONFLICT(category, rank_min, rank_max, title_id) DO UPDATE SET reward_type = 'title', is_active = 1, description = excluded.description, updated_at = CURRENT_TIMESTAMP;
INSERT INTO season_reward_mappings (category, rank_min, rank_max, title_id, reward_type, is_active, description)
SELECT 'casino_loss', 1, 1, id, 'title', 1, '대표 시즌 칭호: 카지노 대참사 1위' FROM titles WHERE name = '시즌 대참사'
ON CONFLICT(category, rank_min, rank_max, title_id) DO UPDATE SET reward_type = 'title', is_active = 1, description = excluded.description, updated_at = CURRENT_TIMESTAMP;
INSERT INTO season_reward_mappings (category, rank_min, rank_max, title_id, reward_type, is_active, description)
SELECT 'drawdown', 1, 1, id, 'title', 1, '대표 시즌 칭호: 최고점 추락 1위' FROM titles WHERE name = '돈은 머무르지 않았다'
ON CONFLICT(category, rank_min, rank_max, title_id) DO UPDATE SET reward_type = 'title', is_active = 1, description = excluded.description, updated_at = CURRENT_TIMESTAMP;
INSERT INTO season_reward_mappings (category, rank_min, rank_max, title_id, reward_type, is_active, description)
SELECT 'point_spent', 1, 1, id, 'title', 1, '대표 시즌 칭호: 포인트 소비 1위' FROM titles WHERE name = '시즌 소각왕'
ON CONFLICT(category, rank_min, rank_max, title_id) DO UPDATE SET reward_type = 'title', is_active = 1, description = excluded.description, updated_at = CURRENT_TIMESTAMP;
INSERT INTO season_reward_mappings (category, rank_min, rank_max, title_id, reward_type, is_active, description)
SELECT 'comment_count', 1, 1, id, 'title', 1, '대표 시즌 칭호: 댓글 활동 1위' FROM titles WHERE name = '격리소 서기관'
ON CONFLICT(category, rank_min, rank_max, title_id) DO UPDATE SET reward_type = 'title', is_active = 1, description = excluded.description, updated_at = CURRENT_TIMESTAMP;

UPDATE season_reward_mappings SET is_active = 0;

INSERT INTO season_reward_mappings (category, rank_min, rank_max, title_id, reward_type, is_active, description)
SELECT 'activity_score', 1, 1, id, 'title', 1, '대표 시즌 칭호: 활동 종합 1위' FROM titles WHERE name = '시즌의 지배자'
ON CONFLICT(category, rank_min, rank_max, title_id) DO UPDATE SET reward_type = 'title', is_active = 1, description = excluded.description, updated_at = CURRENT_TIMESTAMP;
INSERT INTO season_reward_mappings (category, rank_min, rank_max, title_id, reward_type, is_active, description)
SELECT 'casino_loss', 1, 1, id, 'title', 1, '대표 시즌 칭호: 카지노 손실 1위' FROM titles WHERE name = '시즌 대참사'
ON CONFLICT(category, rank_min, rank_max, title_id) DO UPDATE SET reward_type = 'title', is_active = 1, description = excluded.description, updated_at = CURRENT_TIMESTAMP;
INSERT INTO season_reward_mappings (category, rank_min, rank_max, title_id, reward_type, is_active, description)
SELECT 'point_earned', 1, 1, id, 'title', 1, '대표 시즌 칭호: 포인트 수입 1위' FROM titles WHERE name = '포인트 위에 누운 자'
ON CONFLICT(category, rank_min, rank_max, title_id) DO UPDATE SET reward_type = 'title', is_active = 1, description = excluded.description, updated_at = CURRENT_TIMESTAMP;
INSERT INTO season_reward_mappings (category, rank_min, rank_max, title_id, reward_type, is_active, description)
SELECT 'community_activity', 1, 1, id, 'title', 1, '대표 시즌 칭호: 커뮤니티 활동 1위' FROM titles WHERE name = '격리소 서기관'
ON CONFLICT(category, rank_min, rank_max, title_id) DO UPDATE SET reward_type = 'title', is_active = 1, description = excluded.description, updated_at = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO cosmetic_items (code, name, description, type, rarity, price, css_class, preview_text) VALUES
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
  ('danger_red_name', '위험 등급 레드', '위험 표지처럼 붉은 닉네임', 'nickname_color', 'epic', 3500, 'cosmetic-name-danger-red', 'DANGER');

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
  ('CASINO_BIG_WIN', '운빨의 화신', '카지노에서 한 번에 순수익 200P 이상을 냈습니다.', 'casino', 30),
  ('COMMENT_FIRST', '첫 댓글', '처음으로 댓글을 작성했습니다.', 'board', 5),
  ('ANONYMOUS_FIRST', '익명의 첫걸음', '처음으로 익명 게시글 또는 익명 댓글을 작성했습니다.', 'board', 5),
  ('SONG_FIRST_RECOMMEND', '첫 노래추천', '처음으로 노래를 추천했습니다.', 'songs', 5),
  ('DAILY_MISSION_FIRST', '첫 일일 미션', '처음으로 일일 미션 보상을 받았습니다.', 'missions', 5),
  ('DAILY_MISSION_ALL', '오늘의 관찰 완료', '하루의 모든 일일 미션을 완료했습니다.', 'missions', 15);

INSERT OR IGNORE INTO seasons (code, name, description, starts_at, ends_at, status, is_active)
VALUES (
  'season_1',
  '시즌 1 - 격리소 개장전',
  'MADMEN HUB 첫 시즌',
  DATETIME('now', '-1 day'),
  DATETIME('now', '+29 day'),
  'active',
  1
);
