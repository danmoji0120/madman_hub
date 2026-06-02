const mappings = [
  ['insufficient_points', 400, '포인트가 부족합니다.'],
  ['amount_zero', 400, '포인트 변경 금액은 0일 수 없습니다.'],
  ['invalid_reason', 400, '사유를 두 글자 이상 입력해 주세요.'],
  ['invalid_user', 404, '사용자를 찾을 수 없습니다.'],
  ['invalid_target_user', 404, '대상 사용자를 찾을 수 없습니다.'],
  ['forbidden', 403, '권한이 부족합니다.'],
  ['title_not_found', 404, '칭호를 찾을 수 없습니다.'],
  ['inactive_title', 400, '비활성 칭호입니다.'],
  ['admin_title_not_buyable', 400, '관리자 전용 칭호는 구매할 수 없습니다.'],
  ['cosmetic_not_found', 404, '꾸미기 아이템을 찾을 수 없습니다.'],
  ['inactive_cosmetic', 404, '비활성화된 꾸미기 아이템입니다.'],
  ['admin_cosmetic_not_buyable', 403, '관리자 전용 꾸미기 아이템입니다.'],
  ['active_session_exists', 409, '이미 진행 중인 게임이 있습니다.'],
  ['session_not_found', 404, '게임 세션을 찾을 수 없습니다.'],
  ['session_not_owned', 403, '다른 사용자의 게임 세션에는 접근할 수 없습니다.'],
  ['session_not_active', 409, '이미 완료된 게임입니다.'],
  ['invalid_bet_amount', 400, '베팅 금액이 올바르지 않습니다.'],
  ['invalid_payout_amount', 400, '지급 금액이 올바르지 않습니다.'],
  ['invalid_session_status', 400, '게임 세션 상태가 올바르지 않습니다.'],
  ['achievement_not_found', 404, '업적을 찾을 수 없습니다.'],
  ['inactive_achievement', 400, '비활성 업적입니다.'],
  ['mission_not_completed', 409, '미션이 아직 완료되지 않았습니다.'],
  ['mission_already_claimed', 409, '이미 보상을 받은 미션입니다.'],
  ['mission_bonus_not_ready', 409, '미션 보너스 조건을 충족하지 못했습니다.'],
  ['mission_bonus_already_claimed', 409, '이미 받은 미션 보너스입니다.']
];

function mapRpcError(error) {
  const rawMessage = error?.message || 'Supabase RPC failed';
  const mapping = mappings.find(([code]) => rawMessage.includes(code));
  const mapped = new Error(mapping ? mapping[2] : rawMessage);
  mapped.status = mapping ? mapping[1] : 500;
  mapped.statusCode = mapped.status;
  mapped.code = mapping ? mapping[0] : error?.code;
  mapped.details = error?.details;
  return mapped;
}

module.exports = {
  mapRpcError
};
