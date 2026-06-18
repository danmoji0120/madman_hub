# 용병단 성장 밸런스 리포트

생성 시각: 2026-06-18T08:58:52.323Z

## 1. 성장 공식

- LEVEL_STAT_GAIN: `{"hp":3,"atk":2,"def":2,"spd":1,"tec":2,"sup":2}`
- levelBonus 공식: `LEVEL_STAT_GAIN[stat] * Math.max(0, level - 1)`
- currentStats 공식: `baseStats + levelBonus + trainingBonus + equipmentBonus + permanentBonus`
- power 공식: `hp * 0.25 + atk * 1.2 + def + spd * 0.8 + tec * 0.8 + sup * 0.6`
- runtime combat source: `sheet_combat_mission`
- sheet_combat_mission: 6
- legacy runtime operations: 0

## 2. 등급별 대표 용병 성장표

| Grade | Name | Role | MaxLv | Lv.1 | Lv.10 | Lv.20 | Lv.40 | Lv.60 | Lv.70 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N | 거미수인 실함정 보조 | support | 20 | 99 | 178 | 265 | 265 (MAX@20) | 265 (MAX@20) | 265 (MAX@20) |
| N | 인간 심부름 전령 | support | 20 | 99 | 177 | 265 | 265 (MAX@20) | 265 (MAX@20) | 265 (MAX@20) |
| N | 미믹 공구상자 견습 | unknown | 20 | 99 | 177 | 265 | 265 (MAX@20) | 265 (MAX@20) | 265 (MAX@20) |
| N | 여우수인 청구서 말재주꾼 | support | 20 | 99 | 178 | 265 | 265 (MAX@20) | 265 (MAX@20) | 265 (MAX@20) |
| N | 엘프 견습궁수 | dealer | 20 | 98 | 176 | 264 | 264 (MAX@20) | 264 (MAX@20) | 264 (MAX@20) |
| R | 불량계약 결투사 시온 | dealer | 40 | 248 | 327 | 414 | 589 | 589 (MAX@40) | 589 (MAX@40) |
| R | 철거 회계원 도가 | tank | 40 | 244 | 323 | 411 | 586 | 586 (MAX@40) | 586 (MAX@40) |
| R | 피냄새 추적꾼 루다 | tank | 40 | 243 | 322 | 409 | 584 | 584 (MAX@40) | 584 (MAX@40) |
| R | 외문 감시병 베렌 | tank | 40 | 234 | 313 | 400 | 575 | 575 (MAX@40) | 575 (MAX@40) |
| R | 지각배송 대장 로나 | tank | 40 | 234 | 312 | 400 | 575 | 575 (MAX@40) | 575 (MAX@40) |
| SR | 기만술사 세호아 | support | 60 | 373 | 452 | 540 | 715 | 890 | 890 (MAX@60) |
| SR | 함정해체사 아라크네 | unknown | 60 | 372 | 450 | 538 | 713 | 888 | 888 (MAX@60) |
| SR | 검은귀 구조대장 라카 | unknown | 60 | 372 | 451 | 538 | 713 | 888 | 888 (MAX@60) |
| SR | 저주창병 베레스카 | dealer | 60 | 371 | 450 | 537 | 712 | 887 | 887 (MAX@60) |
| SR | 폭파광 몰그림 | dealer | 60 | 371 | 450 | 537 | 712 | 887 | 887 (MAX@60) |
| SSR | 시계태엽 대천사 레굴루스 | tank | 60 | 629 | 707 | 795 | 970 | 1145 | 1145 (MAX@60) |
| SSR | 심해제독 탈라사 | support | 60 | 596 | 674 | 762 | 937 | 1112 | 1112 (MAX@60) |
| SSR | 재앙급 저주술사 모르가나 | support | 80 | 595 | 674 | 761 | 936 | 1111 | 1199 |
| SSR | 금고관리관 카세트 | unknown | 60 | 592 | 670 | 758 | 933 | 1108 | 1108 (MAX@60) |
| SSR | 대문장군 라이카 | tank | 60 | 588 | 667 | 755 | 930 | 1105 | 1105 (MAX@60) |
| EX | BB쨩 | support | 70 | 872 | 950 | 1038 | 1213 | 1388 | 1475 |
| EX | 버그 먹은 회계요정 바이트벨 | support | 70 | 471 | 550 | 638 | 813 | 988 | 1075 |
| EX | 월광 아이돌 기사 루나벨 | tank | 70 | 435 | 513 | 601 | 776 | 951 | 1038 |
| EX | 골판지 드래곤 박스칼리버 | tank | 70 | 417 | 496 | 583 | 758 | 933 | 1021 |
| EX | 그린 헬름 | healer | 70 | 374 | 453 | 540 | 715 | 890 | 978 |

## 3. 같은 레벨 levelBonus 동일성 검증

- 검증 대상: N, R, SR, SSR, EX, ENEMY
- Lv.10 levelBonus: `{"hp":27,"atk":18,"def":18,"spd":9,"tec":18,"sup":18}`
- Lv.1 -> Lv.2 statDelta: `{"hp":3,"atk":2,"def":2,"spd":1,"tec":2,"sup":2}`

## 4. 가상 파티 전투력표

| Party | TotalPower | AvgPower |
| --- | --- | --- |
| N 5인 Lv.1 | 494 | 99 |
| N 5인 Lv.10 | 886 | 177 |
| N 5인 Lv.20 | 1324 | 265 |
| R 5인 Lv.1 | 1203 | 241 |
| R 5인 Lv.10 | 1597 | 319 |
| R 5인 Lv.20 | 2034 | 407 |
| R 5인 Lv.40 | 2909 | 582 |
| SR 5인 Lv.1 | 1859 | 372 |
| SR 5인 Lv.20 | 2690 | 538 |
| SR 5인 Lv.40 | 3565 | 713 |
| SR 5인 Lv.60 | 4440 | 888 |
| SSR 5인 Lv.1 | 3000 | 600 |
| SSR 5인 Lv.20 | 3831 | 766 |
| SSR 5인 Lv.40 | 4706 | 941 |
| SSR 5인 Lv.70 | 5669 | 1134 |
| N/R 3 + SR 1 + SSR 1 Lv.10 | 1841 | 368 |
| N/R 3 + SR 1 + SSR 1 Lv.20 | 2279 | 456 |
| N/R 3 + SR 1 + SSR 1 Lv.40 | 2804 | 561 |
| R 3 + SR 2 Lv.20 | 2312 | 462 |
| R 3 + SR 2 Lv.40 | 3187 | 637 |
| SR 3 + SSR 1 + EX 1 Lv.40 | 4324 | 865 |
| SR 3 + SSR 1 + EX 1 Lv.60 | 5199 | 1040 |
| SR 3 + SSR 1 + EX 1 Lv.70 | 5286 | 1057 |

## 5. 적 성장표

### combat_sewer_slime_cleanup · 하수도 점액괴물 소탕

| Enemy | Role | Lv.1 | Lv.10 | Lv.20 | Lv.40 | Lv.60 | Lv.70 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 하수도 점액괴물 | 탱커 | 163 | 244 | 333 | 516 | 695 | 785 |
| 하수도 점액괴물 | 탱커 | 163 | 244 | 333 | 516 | 695 | 785 |
| 하수도 점액괴물 | 탱커 | 147 | 223 | 305 | 470 | 637 | 720 |

### combat_mimic_entrance_sweep · 던전 입구 미믹 퇴치

| Enemy | Role | Lv.1 | Lv.10 | Lv.20 | Lv.40 | Lv.60 | Lv.70 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 낡은 미믹 상자 | 탱커 | 265 | 356 | 457 | 658 | 860 | 960 |
| 쥐도적 | 딜러 | 209 | 298 | 399 | 602 | 803 | 904 |
| 쥐도적 | 딜러 | 192 | 275 | 369 | 555 | 740 | 834 |

### combat_debtbreaker_skirmish · 채무 불이행 용병단 제압

| Enemy | Role | Lv.1 | Lv.10 | Lv.20 | Lv.40 | Lv.60 | Lv.70 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 채권추심단 행동대원 | 딜러 | 265 | 359 | 463 | 673 | 881 | 986 |
| 채권추심단 행동대원 | 딜러 | 265 | 359 | 463 | 673 | 881 | 986 |
| 채권추심단장 | 지휘 | 309 | 394 | 486 | 672 | 858 | 951 |

### combat_tower_waste_summon · 마탑 폐기 소환체 회수

| Enemy | Role | Lv.1 | Lv.10 | Lv.20 | Lv.40 | Lv.60 | Lv.70 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 폐기 소환체 | 딜러 | 318 | 425 | 543 | 778 | 1013 | 1132 |
| 폐기 소환체 | 딜러 | 318 | 425 | 543 | 778 | 1013 | 1132 |
| 태엽 파수꾼 | 탱커 | 318 | 416 | 524 | 741 | 959 | 1068 |

### combat_abyss_dock_servants · 부두 심해 하수인 충돌

| Enemy | Role | Lv.1 | Lv.10 | Lv.20 | Lv.40 | Lv.60 | Lv.70 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 심해계약 하수인 | 서브딜러 | 390 | 504 | 631 | 882 | 1135 | 1262 |
| 심해계약 하수인 | 서브딜러 | 390 | 504 | 631 | 882 | 1135 | 1262 |
| 심해계약 하수인 | 서브딜러 | 355 | 461 | 577 | 810 | 1042 | 1159 |

### combat_red_thread_alley_chase · 붉은실 골목 추적전

| Enemy | Role | Lv.1 | Lv.10 | Lv.20 | Lv.40 | Lv.60 | Lv.70 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 붉은실 추적자 | 암살 | 342 | 429 | 525 | 718 | 911 | 1007 |
| 붉은실 추적자 | 암살 | 342 | 429 | 525 | 718 | 911 | 1007 |
| 쥐도적 | 딜러 | 193 | 273 | 362 | 541 | 720 | 810 |
| 쥐도적 | 딜러 | 193 | 273 | 362 | 541 | 720 | 810 |


## 6. 작전별 recommendedPower 비교

| Source | Operation | Title | Current | EnemyTotal | Easy | Normal | Hard | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sheet_combat_mission | combat_sewer_slime_cleanup | 하수도 점액괴물 소탕 | 380 | 473 | 402 | 473 | 543 | 대체로 정상 범위 |
| sheet_combat_mission | combat_mimic_entrance_sweep | 던전 입구 미믹 퇴치 | 520 | 695 | 590 | 695 | 799 | 대체로 정상 범위 |
| sheet_combat_mission | combat_debtbreaker_skirmish | 채무 불이행 용병단 제압 | 620 | 902 | 766 | 902 | 1037 | 대체로 정상 범위 |
| sheet_combat_mission | combat_tower_waste_summon | 마탑 폐기 소환체 회수 | 760 | 1057 | 898 | 1057 | 1215 | 대체로 정상 범위 |
| sheet_combat_mission | combat_abyss_dock_servants | 부두 심해 하수인 충돌 | 860 | 1281 | 1088 | 1281 | 1473 | 대체로 정상 범위 |
| sheet_combat_mission | combat_red_thread_alley_chase | 붉은실 골목 추적전 | 1040 | 1254 | 1065 | 1254 | 1442 | 대체로 정상 범위 |

## 7. 시트 전투 의뢰 목록

| Operation | Title | RecommendedPower | EnemyCount | RewardGroup |
| --- | --- | --- | --- | --- |
| combat_sewer_slime_cleanup | 하수도 점액괴물 소탕 | 380 | 3 | combat_reward_low_basic |
| combat_mimic_entrance_sweep | 던전 입구 미믹 퇴치 | 520 | 3 | combat_reward_low_gear |
| combat_debtbreaker_skirmish | 채무 불이행 용병단 제압 | 620 | 3 | combat_reward_medium_bounty |
| combat_tower_waste_summon | 마탑 폐기 소환체 회수 | 760 | 3 | combat_reward_high_arcane |
| combat_abyss_dock_servants | 부두 심해 하수인 충돌 | 860 | 3 | combat_reward_high_abyss |
| combat_red_thread_alley_chase | 붉은실 골목 추적전 | 1040 | 4 | combat_reward_danger_red_thread |

## 8. 초반 3개 sheet 작전 점검

| Source | Operation | Title | Current | EnemyTotal | CandidateNormal | Party Ratios |
| --- | --- | --- | --- | --- | --- | --- |
| sheet_combat_mission | combat_sewer_slime_cleanup | 하수도 점액괴물 소탕 | 380 | 473 | 473 | N 5인 Lv.10: 2.332 (압도적 우세)<br>R 5인 Lv.10: 4.203 (압도적 우세)<br>SR 5인 Lv.20: 7.079 (압도적 우세)<br>SSR 5인 Lv.20: 10.082 (압도적 우세)<br>N/R 3 + SR 1 + SSR 1 Lv.10: 4.845 (압도적 우세)<br>N/R 3 + SR 1 + SSR 1 Lv.20: 5.997 (압도적 우세)<br>N/R 3 + SR 1 + SSR 1 Lv.40: 7.379 (압도적 우세) |
| sheet_combat_mission | combat_mimic_entrance_sweep | 던전 입구 미믹 퇴치 | 520 | 695 | 695 | N 5인 Lv.10: 1.704 (압도적 우세)<br>R 5인 Lv.10: 3.071 (압도적 우세)<br>SR 5인 Lv.20: 5.173 (압도적 우세)<br>SSR 5인 Lv.20: 7.367 (압도적 우세)<br>N/R 3 + SR 1 + SSR 1 Lv.10: 3.54 (압도적 우세)<br>N/R 3 + SR 1 + SSR 1 Lv.20: 4.383 (압도적 우세)<br>N/R 3 + SR 1 + SSR 1 Lv.40: 5.392 (압도적 우세) |
| sheet_combat_mission | combat_debtbreaker_skirmish | 채무 불이행 용병단 제압 | 620 | 902 | 902 | N 5인 Lv.10: 1.429 (압도적 우세)<br>R 5인 Lv.10: 2.576 (압도적 우세)<br>SR 5인 Lv.20: 4.339 (압도적 우세)<br>SSR 5인 Lv.20: 6.179 (압도적 우세)<br>N/R 3 + SR 1 + SSR 1 Lv.10: 2.969 (압도적 우세)<br>N/R 3 + SR 1 + SSR 1 Lv.20: 3.676 (압도적 우세)<br>N/R 3 + SR 1 + SSR 1 Lv.40: 4.523 (압도적 우세) |

## 9. 전투 로그 문구 export 상태

- total combatLogs: 14
- enabled combatLogs: 14
- logGroupId: combat_abyss, combat_debt, combat_default, combat_injury, combat_mimic, combat_red_thread, combat_slime
- logType: ally_attack, ally_heal, critical, defeat, enemy_attack, injury, miss, start, victory

## 10. enemy skill 검증

- missing actionSkillId: 0
- missing basicAttackId: 0
- fallback: Missing enemy actionSkillId is ignored at battle runtime; basicAttackId falls back to normal_strike if unknown.

| Enemy | MissingSkillId |
| --- | --- |

## 11. 조정 후보

추천값은 자동 반영하지 않았습니다. 우선 검토 후보는 `candidateNormal`을 중심으로, 초반 완충이 필요하면 `candidateEasy`, 고난도 표기가 필요하면 `candidateHard`를 참고하세요.

| Operation | CandidateEasy | CandidateNormal | CandidateHard |
| --- | --- | --- | --- |
| sheet_combat_mission:combat_sewer_slime_cleanup | 402 | 473 | 543 |
| sheet_combat_mission:combat_mimic_entrance_sweep | 590 | 695 | 799 |
| sheet_combat_mission:combat_debtbreaker_skirmish | 766 | 902 | 1037 |
| sheet_combat_mission:combat_tower_waste_summon | 898 | 1057 | 1215 |
| sheet_combat_mission:combat_abyss_dock_servants | 1088 | 1281 | 1473 |
| sheet_combat_mission:combat_red_thread_alley_chase | 1065 | 1254 | 1442 |

## 12. 주의사항

- 훈련/장비/사무소 해금 보정은 반영하지 않았습니다.
- 현재 runtime 기준은 sheet combat mission 6개입니다.
- 실제 체감은 스킬/상태/AI/명중/치명 때문에 달라질 수 있습니다.
- master JSON은 수정하지 않았고, report 파일만 생성했습니다.
