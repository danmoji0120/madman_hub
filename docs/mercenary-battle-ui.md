# Mercenary Battle Board UI Notes

## Battle board entry

Opening the battle board directly must ensure owned mercenaries are loaded.
If `ownedMercenaryRoster` is empty, the board calls `/api/mercenary/my` before relying on saved battle party slots.

The ready panel shows clear states:

- `용병 정보 불러오는 중...`
- `편성 필요`
- `최소 인원 부족`
- `전투 불가 용병 포함`
- `로그인이 필요합니다`
- `용병 정보를 불러오지 못했습니다.`

## Detail power summary

The center operation detail owns the power summary.
It shows:

- `총 전투력`
- `권장 전투력`
- `전력 판정`

The judgement helper is UI-only:

- no party power: `편성 필요`
- party power >= recommended power * 1.2: `우세`
- party power >= recommended power * 0.9: `적정`
- otherwise: `위험`

## Operation list

The left operation list stays compact.
It shows status, title, danger/duration, and one reward line.
Recommended power and party power are not repeated there.

The battle board runtime source is sheet combat mission data only.
The six visible operations are loaded from `public/data/mercenary.combat-missions.master.json`.
Legacy mock operations are not used as a fallback.
If the sheet export JSON is missing or empty, the board shows `전투 의뢰 데이터 없음` and asks the developer to check the export file.

## Battle party editing

The single battle party editing entry point is the ready panel action button:
`전투 파티 편성`.

## Reward preview

The operation detail previews core combat rewards by `rewardGroupId`.
It sums:

- gold
- office EXP
- mercenary EXP

Non-core rewards stay separated as future system work.

## Battle result modal

The battle viewer keeps only speed controls during combat.
Pause, skip, and close controls are not rendered while a battle is running.

When replay finishes, the result report opens in a centered modal instead of being attached under the battle viewer.
The modal shows:

- victory/defeat
- operation title and round count
- MVP and core battle metrics
- settlement status
- actual claim rewards
- injury/infirmary status for actual injured mercenaries only
- detailed combat report sections
- round-by-round detailed log

The injury section is not a party roster. It filters claim injuries and mercenary claim results through actual injury statuses such as `injured_light`, `injured_heavy`, `treatment_required`, and `incapacitated`.
If no actual injury exists, the modal shows `부상자 없음 / 전원 무사 복귀`.

The detailed combat report is rendered inside the centered modal, not below the viewer.
It is derived from `battleResult` and includes:

- `전투 요약`
- `아군 전투 기록`
- `적 전투 기록`
- `스킬 사용 기록`
- `상태이상 / 디버프 기록`
- `라운드별 상세 로그`

Skill names and status names prefer display names from loaded combat rules.
Unit HP, dealt damage, taken damage, healing, status application, kills, and round logs are displayed from the recorded battle result data.

## Automatic settlement

Battle settlement starts automatically once per `battleId` when the viewer reaches a finished state.
Client state uses `claimState.status`:

- `idle`
- `claiming`
- `claimed`
- `failed`

The server claim endpoint remains idempotent and is still the source of truth for gold, EXP, and injuries.
Client preview rewards are never trusted for payment.
Server rewards are resolved from sheet combat mission `rewardGroupId` and combat reward JSON.
Legacy mock operation ids are no longer reward-claim targets.

Failed settlement keeps the result modal open and shows `정산 재시도`.
Retry calls the same claim endpoint with the same battle payload, relying on server idempotency to prevent duplicate rewards.

## Infirmary refresh

After a successful claim, owned mercenaries and infirmary data are refreshed.
The modal distinguishes injury registration from treatment start; treatment itself still happens in the infirmary UI.

## Battle audio

`public/js/mercenary-audio.js` handles battle BGM and SFX, while the existing lobby BGM system in `public/js/mercenary-lobby.js` remains the owner of office/lobby BGM playback.
The battle audio layer extends the existing BGM settings instead of replacing them.

Autoplay policy:

- Audio unlock is attempted after the first `pointerdown`, `click`, or `keydown`.
- Playback failures or missing files are logged as warnings and never block battle progress.

Existing BGM localStorage keys are preserved:

- `mercenary.bgm.enabled`
- `mercenary.bgm.volume`
- `mercenary.bgm.mode`
- `mercenary.bgm.currentTrackId`

New audio localStorage keys:

- `mercenary.audio.muted`
- `mercenary.audio.bgmMuted`
- `mercenary.audio.sfxMuted`
- `mercenary.audio.masterVolume`
- `mercenary.audio.bgmVolume`
- `mercenary.audio.sfxVolume`

Migration policy:

- If new BGM keys are absent, `mercenary.bgm.enabled` and `mercenary.bgm.volume` seed the new BGM mute/volume settings.
- New settings are then written back while the legacy BGM keys continue to be updated for compatibility.
- Legacy keys are never removed by the audio manager.

Mute roles:

- `master mute`: mutes BGM and SFX.
- `BGM mute`: stops lobby BGM and battle BGM only.
- `SFX mute`: mutes UI and battle SFX only.

Settings modal:

- `사운드 전체 끄기`
- `BGM 사용`
- `SFX 사용`
- `마스터 볼륨`
- `BGM 볼륨`
- `SFX 볼륨`
- `BGM 재생 순서`
- `SFX 테스트`

Battle BGM:

- `battle_01`: `/assets/mercenary/bgm/battle_01.mp3`
- `battle_02`: `/assets/mercenary/bgm/battle_02.mp3`

Battle start pauses the existing lobby BGM, picks one battle BGM, loops it, and fades it in.
Battle finish fades out battle BGM, plays the victory/defeat SFX, and returns to the existing lobby BGM policy when the result modal closes.

Result SFX:

- victory: `/assets/mercenary/sfx/battle/battle_victory.mp3`
- defeat: `/assets/mercenary/sfx/battle/battle_defeat.mp3`

SFX mapping:

- UI click: `/assets/mercenary/sfx/ui/button_click.mp3`
- UI hover: `/assets/mercenary/sfx/ui/button_hover.mp3`
- normal attack: `/assets/mercenary/sfx/battle/attack_normal.mp3` + `hit_light`
- critical attack: `/assets/mercenary/sfx/battle/attack_critical.mp3` + `hit_heavy`
- magic/hack style action: `/assets/mercenary/sfx/battle/attack_magic.mp3`
- ranged/snipe style action: `/assets/mercenary/sfx/battle/attack_ranged.mp3`
- heal: `/assets/mercenary/sfx/battle/heal.mp3`
- miss: `/assets/mercenary/sfx/battle/miss.mp3`
- heavy hit/finisher: `/assets/mercenary/sfx/battle/hit_heavy.mp3`
- light hit: `/assets/mercenary/sfx/battle/hit_light.mp3`

## Combat request contract

The battle board now enters combat through a shared client contract instead of calling the viewer directly with only a battle operation object.

Files:

- `public/js/mercenary-combat-contract.js`
- `public/js/mercenary-combat-adapters.js`

`CombatRequest` fields:

- `requestId`
- `sourceType`
- `sourceId`
- `missionId`
- `partyMemberIds`
- `partySnapshot`
- `difficulty`
- `seed`
- `options.autoClaim`
- `options.viewerMode`
- `metadata.callerLabel`
- `metadata.originTitle`

`CombatResult` fields:

- `requestId`
- `sourceType`
- `sourceId`
- `missionId`
- `runId`
- `outcome`
- `rounds`
- `mvp`
- `stats`
- `rewards`
- `injuries`
- `logs`
- `claim`
- `visual`

Supported source types:

- `combat_mission`: executable now.
- `rumor`: contract skeleton only.
- `case`: contract skeleton only.
- `exploration`: contract skeleton only.
- `tower`: contract skeleton only.
- `raid`: contract skeleton only.

Unsupported or not-yet-executable source types must fail before opening the viewer.
The current sheet combat missions use `sourceType: "combat_mission"` and keep their sheet mission id as `sourceId`.
The existing battle result modal, automatic claim, BGM/SFX handoff, rewards, EXP, and infirmary refresh keep using the normalized battle result shape.
