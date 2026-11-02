import { installDetailPortraits } from "./ui/detail-portraits.js";
import smoothPortraits from "./ui/smooth-portrait-map.js";
import { installMoranFrost } from "./ui/moran-frost.js";
import { createCharacterPackage, createSkillPackage } from "./character/index.js";
import { createCardPackage } from "./card/index.js";
import { lib, game, ui, _status } from "../../noname.js";
import { installSelectionConfirm } from "./ui/confirm.js";
import characterTitles from "./character/title.js";
import { installZibaiEyes } from "./ui/zibai-eyes.js";
import { installZibaiControlPrivacy } from "./ui/zibai-control-privacy.js";
import { installSkillVoices } from "./ui/skill-voices.js";
import { get } from "../../noname.js";
import { installMechanismCardStyle } from "./ui/mechanism-cards.js";

function sortLocalHandcards() {
  if (game.me && game.me.countCards("h") > 1) {
    // 与原生“整理手牌”按钮保持一致，包括临时排序规则及联机同步。
    game.me.sortHandcardOL(_status.tempHandcardSort);
  }
}

export const type = "extension";

export default function () {
  return {
    name: "原神",
    content() {
      (lib.dynamicTranslate ||= {}).fan_tianlin = player => player.storage.fan_duanyu_failed
        ? "锁定技，每轮开始时，你选择一个本局游戏未选择过的基本牌或普通锦囊牌的牌名，那之后，当其他角色使用牌名被【天霖】选择过，且非转化的手牌指定目标时，你于此牌结算后将其置于你的武将牌上，称为“忆”，然后你摸一张牌。"
        : lib.translate.fan_tianlin_info;
      if (!lib.hooks.checkEnd.some(fn => fn.fanTianlinAuto)) {
        const submit = (event, { ok }) => {
          if (!ok || !event.isMine() || !(lib.skill[event.skill]?.fan_tianlin_auto || lib.skill[event.skill]?.fan_wanli_auto) || event.fan_tianlin_submitting) return;
          const skill = event.skill;
          event.fan_tianlin_submitting = true;
          // chooseToUse 在 check() 返回后仍会 pause()。同步 ok/resume 会被后面的
          // pause 再次暂停，形成无按钮的死界面；须等本轮选择初始化完成再提交。
          Promise.resolve().then(() => {
            try {
              // filterOk is optional. Re-run the native full legality check instead;
              // keep the guard set so this check cannot schedule another submission.
              if (_status.event === event && event.skill === skill && game.check()) {
                // Match native autoConfirm: check() may recreate the outer confirm bar.
                // Close it before entering the skill's own chooseControl.
                if (ui.confirm) ui.confirm.close();
                if (event.skillDialog === true) event.skillDialog = false;
                ui.click.ok();
              }
            } finally {
              event.fan_tianlin_submitting = false;
            }
          });
        };
        submit.fanTianlinAuto = true;
        lib.hooks.checkEnd.push(submit);
      }
      installMechanismCardStyle();
      installSkillVoices(get);
      installMoranFrost(lib);
      installSelectionConfirm(ui, _status, lib);
      installZibaiEyes(ui, game);
      installZibaiControlPrivacy(game, lib);
      installDetailPortraits(ui, lib);
      // 始终注册，允许在本局中即时切换选项；仅影响本机玩家。
      lib.skill.fan_auto_sort_handcards = {
        trigger: {
          global: ["gainAfter", "loseAsyncAfter", "gameDrawAfter", "phaseBegin"],
        },
        forced: true,
        silent: true,
        popup: false,
        filter() {
          return !!game.getExtensionConfig("原神", "auto_sort_handcards") &&
            !!game.me && game.me.countCards("h") > 1;
        },
        async content() {
          sortLocalHandcards();
        },
      };
      game.addGlobalSkill("fan_auto_sort_handcards");
    },
    precontent() {
      // 扩展加载时注册，武将详情页直接从此表读取称号。
      Object.assign(lib.characterTitle, characterTitles);
    },
    config: {
      auto_sort_handcards: {
        name: "手牌自动排序",
        intro: "自动按原生“整理手牌”按钮的规则整理自己的手牌，适用于所有武将。开启后立即整理，获得牌及回合开始时自动整理。",
        init: false,
        onclick(value) {
          game.saveExtensionConfig("原神", "auto_sort_handcards", value);
          if (value) sortLocalHandcards();
        },
      },
    },
    package: {
      character: createCharacterPackage(),
      skill: createSkillPackage(),
      card: createCardPackage(),
    },
    files: {
      character: [...Object.values(smoothPortraits), "image/character/originals/sandrone.png", "image/character/portraits/sandrone.png", "image/character/portraits/sandrone-select.png", "image/character/portraits/sandrone-detail.png", "image/character/originals/nicole.png", "image/character/portraits/nicole.png", "image/character/portraits/nicole-select.png", "image/character/portraits/nicole-detail.png", "image/character/originals/citlali.png", "image/character/portraits/citlali.png", "image/character/portraits/citlali-select.png", "image/character/portraits/citlali-detail.png", "image/character/originals/mona.png", "image/character/portraits/mona.png", "image/character/portraits/mona-select.png", "image/character/portraits/mona-detail.png", "image/character/originals/qiqi.png", "image/character/portraits/qiqi.png", "image/character/portraits/qiqi-select.png", "image/character/portraits/qiqi-detail.png", "image/character/portraits/jean-select-centered-20261028.png", "image/character/portraits/jean-centered-20261028.png", "image/character/portraits/jean-detail-centered-20261028.png", "image/character/originals/jean.png", "image/character/portraits/jean.png", "image/character/portraits/jean-select.png", "image/character/portraits/jean-detail.png", "image/character/portraits/xiao-centered-20261027.png", "image/character/portraits/xiao-detail-centered-20261027.png", "image/character/originals/xiao.png", "image/character/portraits/xiao.png", "image/character/portraits/xiao-select.png", "image/character/portraits/xiao-detail.png", "image/character/originals/hutao.png", "image/character/originals/hutao-skin1.jpg", "image/character/originals/hutao-skin2.png",
        "image/character/portraits/hutao.png", "image/character/portraits/hutao-select.png", "image/character/portraits/hutao-detail.png",
        "image/character/portraits/hutao-skin1.png", "image/character/portraits/hutao-skin1-select.png", "image/character/portraits/hutao-skin1-detail.png",
        "image/character/portraits/hutao-skin2.png", "image/character/portraits/hutao-skin2-select.png", "image/character/portraits/hutao-skin2-detail.png",
        "image/skin/fan_hutao/1.png", "image/skin/fan_hutao/2.png",
        "audio/linnea/skill/fan_bowen_reveal_voice1.mp3","audio/linnea/skill/fan_bowen_reveal_voice2.mp3","audio/linnea/skill/fan_bowen_convert_voice1.mp3","audio/linnea/skill/fan_bowen_convert_voice2.mp3","audio/linnea/skill/fan_bowen_convert_voice3.mp3","audio/linnea/skill/fan_bowen_convert_voice4.mp3","audio/linnea/skill/fan_bowen_convert_voice5.mp3","audio/linnea/skill/fan_shizhi_draw_voice1.mp3","audio/linnea/skill/fan_shizhi_draw_voice2.mp3","audio/linnea/skill/fan_shizhi_cancel_voice1.mp3","audio/linnea/skill/fan_shizhi_cancel_voice2.mp3","audio/linnea/skill/fan_shizhi_cancel_voice3.mp3","audio/linnea/die/fan_linnea1.mp3","audio/linnea/die/fan_linnea2.mp3","audio/linnea/die/fan_linnea3.mp3",
        "image/character/originals/linnea.jpg", "image/character/portraits/linnea.png", "image/character/portraits/linnea-select.png", "image/character/portraits/linnea-detail.png",
        "image/character/originals/ganyu.png", "image/character/portraits/ganyu.png", "image/character/portraits/ganyu-select.png", "image/character/portraits/ganyu-detail.png", "image/character/portraits/xianyun.png", "image/character/portraits/xianyun-avatar-20261027.png",
        "image/character/portraits/skirk-v2.png", "image/character/portraits/skirk-avatar-20261027.png",
        "image/character/portraits/shenhe.png", "image/character/portraits/shenhe-avatar-20261027.png"],
      card: ["image/card/fan_pengrenshenji-mechanism.png", "image/card/fan_zhuxing-mechanism.png",
        "image/card/fan_guizhongji-mechanism.png", "image/card/fan_chengehu-mechanism.png"],
      skill: [], audio: [
      "audio/furina/skill/fan_zhongyu_guard1.mp3",
      "audio/furina/skill/fan_zhongyu_guard2.mp3",

      "audio/furina/die/fan_furina.mp3",
      "audio/furina/skill/fan_duqi1.mp3",
      "audio/furina/skill/fan_duqi2.mp3",
      "audio/furina/skill/fan_huanyan1.mp3",
      "audio/furina/skill/fan_huanyan2.mp3",
      "audio/furina/skill/fan_huanyan3.mp3",
      "audio/furina/skill/fan_shanyao_ally1.mp3",
      "audio/furina/skill/fan_shanyao_ally2.mp3",
      "audio/furina/skill/fan_shanyao_heal1.mp3",
      "audio/furina/skill/fan_shanyao_heal2.mp3",
      "audio/furina/skill/fan_shanyao_heal3.mp3",
      "audio/furina/skill/fan_shanyao_loss1.mp3",
      "audio/furina/skill/fan_shanyao_loss2.mp3",
      "audio/furina/skill/fan_shanyao_loss3.mp3",
      "audio/furina/skill/fan_zhongyu_failure.mp3",
      "audio/furina/skill/fan_zhongyu_success.mp3",

      "audio/nilou/skill/fan_pianzhuan_repeat_voice1.ogg",
      "audio/nilou/skill/fan_pianzhuan_repeat_voice2.ogg",
      "audio/nilou/skill/fan_pianzhuan_repeat_voice3.ogg",
      "audio/nilou/skill/fan_pianzhuan_guard_voice1.ogg",
      "audio/nilou/skill/fan_pianzhuan_guard_voice2.ogg",
      "audio/nilou/skill/fan_pianzhuan_guard_voice3.ogg",

      "audio/nilou/skill/fan_chuchen_extra.mp3",
      "audio/nilou/die/fan_nilou_extra2.mp3",
      "audio/nilou/die/fan_nilou_extra3.mp3",
      "audio/nahida/skill/fan_huaqiu_start_voice1.mp3",
      "audio/nahida/skill/fan_huaqiu_start_voice2.mp3",
      "audio/nahida/skill/fan_huaqiu_guard_voice1.mp3",
      "audio/nahida/skill/fan_huaqiu_guard_voice2.mp3",
      "audio/nahida/skill/fan_huaqiu_end_voice1.mp3",
      "audio/nahida/skill/fan_wenshou_select_voice1.mp3",
      "audio/nahida/skill/fan_wenshou_select_voice2.mp3",
      "audio/nahida/skill/fan_wenshou_bless_voice1.mp3",
      "audio/nahida/skill/fan_wenshou_bless_voice2.mp3",
      "audio/nahida/skill/fan_wenshou_punish_voice1.mp3",
      "audio/nahida/skill/fan_wenshou_punish_voice2.mp3",
      "audio/nahida/skill/fan_wenshou_gain_voice1.mp3",
      "audio/nahida/skill/fan_wenshou_gain_voice2.mp3",
      "audio/nahida/skill/fan_huanjing_voice1.mp3",
      "audio/nahida/skill/fan_huanjing_voice2.mp3",
      "audio/nahida/skill/fan_huanjing_voice3.mp3",
      "audio/nahida/die/fan_nahida1.mp3",
      "audio/nahida/die/fan_nahida2.mp3",
      "audio/nahida/die/fan_nahida3.mp3",
      "audio/chasca/skill/fan_tiaoting1.mp3", "audio/chasca/skill/fan_tiaoting2.mp3",
      "audio/chasca/skill/fan_xixin1.mp3", "audio/chasca/skill/fan_xixin2.mp3", "audio/chasca/skill/fan_xixin3.mp3",
      "audio/chasca/die/fan_chasca1.mp3", "audio/chasca/die/fan_chasca2.mp3",
      "audio/clorinde/skill/fan_zhuying_gain_voice1.mp3",
      "audio/clorinde/skill/fan_zhuying_gain_voice2.mp3",
      "audio/clorinde/skill/fan_zhuying1.mp3",
      "audio/clorinde/skill/fan_zhuying2.mp3",
      "audio/clorinde/skill/fan_canguang1.mp3",
      "audio/clorinde/skill/fan_canguang2.mp3",
      "audio/clorinde/die/fan_clorinde1.mp3",
      "audio/clorinde/die/fan_clorinde2.mp3",
      "audio/clorinde/die/fan_clorinde3.mp3",

      "audio/emilie/skill/fan_xiecui_voice1.mp3",
      "audio/emilie/skill/fan_xiecui_voice2.mp3",
      "audio/emilie/skill/fan_xiecui_voice3.mp3",
      "audio/emilie/skill/fan_yuxun_record_voice1.mp3",
      "audio/emilie/skill/fan_yuxun_record_voice2.mp3",
      "audio/emilie/skill/fan_yuxun_convert_voice1.mp3",
      "audio/emilie/skill/fan_yuxun_convert_voice2.mp3",
      "audio/emilie/skill/fan_yuxun_convert_voice3.mp3",
      "audio/emilie/die/fan_emilie1.mp3",
      "audio/emilie/die/fan_emilie2.mp3",
      "audio/emilie/die/fan_emilie3.mp3",

      "audio/arlecchino/skill/fan_chiyi1.mp3",
      "audio/arlecchino/skill/fan_chiyi2.mp3",
      "audio/arlecchino/skill/fan_luhuo_start1.mp3",
      "audio/arlecchino/skill/fan_luhuo_start2.mp3",
      "audio/arlecchino/skill/fan_luhuo_start3.mp3",
      "audio/arlecchino/skill/fan_luhuo_draw1.mp3",
      "audio/arlecchino/skill/fan_luhuo_draw2.mp3",
      "audio/arlecchino/skill/fan_luhuo_attack1.mp3",
      "audio/arlecchino/skill/fan_luhuo_attack2.mp3",
      "audio/arlecchino/skill/fan_ruyue_rise1.mp3",
      "audio/arlecchino/skill/fan_ruyue_fall1.mp3",
      "audio/arlecchino/skill/fan_ruyue_rise2.mp3",
      "audio/arlecchino/skill/fan_ruyue_fall2.mp3",
      "audio/arlecchino/skill/fan_ruyue_convert_voice1.mp3",
      "audio/arlecchino/skill/fan_ruyue_convert_voice2.mp3",
      "audio/arlecchino/skill/fan_ruyue_convert_voice3.mp3",
      "audio/arlecchino/die/fan_arlecchino1.mp3",
      "audio/arlecchino/die/fan_arlecchino2.mp3",
      "audio/arlecchino/die/fan_arlecchino3.mp3",

      "audio/wriothesley/skill/fan_dianyu1.mp3",
      "audio/wriothesley/skill/fan_dianyu2.mp3",
      "audio/wriothesley/skill/fan_dianyu_end_voice1.mp3",
      "audio/wriothesley/skill/fan_dianyu_end_voice2.mp3",
      "audio/wriothesley/skill/fan_dianyu_gain_voice1.mp3",
      "audio/wriothesley/skill/fan_dianyu_gain_voice2.mp3",
      "audio/wriothesley/die/fan_wriothesley1.mp3",
      "audio/wriothesley/die/fan_wriothesley2.mp3",
      "audio/wriothesley/die/fan_wriothesley3.mp3",
      "audio/skirk/skill/fan_jianliu_backup1.mp3",
      "audio/skirk/skill/fan_jianliu_backup2.mp3",
      "audio/skirk/skill/fan_jianliu_backup3.mp3",
      "audio/skirk/skill/fan_guiji1.mp3",
      "audio/skirk/skill/fan_guiji2.mp3",
      "audio/skirk/skill/fan_guiji_capture1.mp3",
      "audio/skirk/skill/fan_guiji_capture2.mp3",
      "audio/skirk/skill/fan_xingmie1.mp3",
      "audio/skirk/skill/fan_xingmie2.mp3",
      "audio/skirk/skill/fan_xingmie3.mp3",
      "audio/skirk/die/fan_skirk1.mp3",
      "audio/skirk/die/fan_skirk2.mp3",
      "audio/skirk/die/fan_skirk3.mp3",

      "audio/sandrone/skill/fan_xigou_number.mp3",
      "audio/sandrone/skill/fan_xigou_suit.mp3",
      "audio/sandrone/skill/fan_xigou_type.mp3",
      "audio/sandrone/skill/fan_xigou_view.mp3",
      "audio/sandrone/skill/fan_wanli_choice1.mp3",
      "audio/sandrone/skill/fan_wanli_choice2.mp3",
      "audio/sandrone/skill/fan_wanli_choice3.mp3",
      "audio/sandrone/skill/fan_wanli_beishui1.mp3",
      "audio/sandrone/skill/fan_wanli_beishui2.mp3",
      "audio/sandrone/skill/fan_wanli_beishui3.mp3",
      "audio/sandrone/skill/fan_yaoyue_voice1.mp3",
      "audio/sandrone/skill/fan_yaoyue_voice2.mp3",
      "audio/sandrone/die/fan_sandrone1.mp3",
      "audio/sandrone/die/fan_sandrone2.mp3",
      "audio/sandrone/die/fan_sandrone3.mp3",

        "audio/nicole/die/fan_nicole1.mp3",
        "audio/nicole/die/fan_nicole2.mp3",
        "audio/nicole/die/fan_nicole3.mp3",

        "audio/nicole/skill/fan_tianlin_before1.mp3",
        "audio/nicole/skill/fan_tianlin_before2.mp3",
        "audio/nicole/skill/fan_duanyu_success.mp3",
        "audio/nicole/skill/fan_duanyu_failure.mp3",
        "audio/nicole/skill/fan_xuanji_story1.mp3",
        "audio/nicole/skill/fan_tianlin_after1.mp3",
        "audio/nicole/skill/fan_tianlin_after2.mp3",
        "audio/nicole/skill/fan_tianlin_after3.mp3",
        "audio/nicole/skill/fan_tianlin_after4.mp3",
        "audio/nicole/skill/fan_tianlin_after5.mp3",
        "audio/nicole/skill/fan_duanyu_guard1.mp3",
        "audio/nicole/skill/fan_duanyu_guard2.mp3",
        "audio/nicole/skill/fan_duanyu_guard3.mp3",
        "audio/nicole/skill/fan_tianlin_draw_voice1.mp3",
        "audio/nicole/skill/fan_tianlin_draw_voice2.mp3",
        "audio/nicole/skill/fan_tianlin_draw_voice3.mp3",
        "audio/nicole/skill/fan_xuanji_story2.mp3",
        "audio/nicole/skill/fan_xuanji_story3.mp3",
        "audio/nicole/skill/fan_xuanji_story4.mp3",
        "audio/nicole/skill/fan_xuanji_story5.mp3",

      "audio/citlali/skill/fan_yingxin_start.mp3", "audio/citlali/skill/fan_yingxin_draw1.mp3", "audio/citlali/skill/fan_yingxin_draw2.mp3", "audio/citlali/skill/fan_zhuyao_lose1.mp3", "audio/citlali/skill/fan_zhuyao_lose2.mp3", "audio/citlali/skill/fan_zhuyao_draw1.mp3", "audio/citlali/skill/fan_zhuyao_draw2.mp3", "audio/citlali/skill/fan_zhuyao_chengshi.mp3", "audio/citlali/skill/fan_citlali_lianying1.mp3", "audio/citlali/skill/fan_citlali_lianying2.mp3", "audio/citlali/skill/fan_miyan_use1.mp3", "audio/citlali/skill/fan_miyan_use2.mp3", "audio/citlali/skill/fan_miyan_turn1.mp3", "audio/citlali/skill/fan_miyan_turn2.mp3", "audio/citlali/die/fan_citlali1.mp3", "audio/citlali/die/fan_citlali2.mp3", "audio/citlali/die/fan_citlali3.mp3",
      "audio/mona/skill/fan_jiliu1.mp3", "audio/mona/skill/fan_jiliu2.mp3", "audio/mona/skill/fan_jiliu3.mp3", "audio/mona/skill/fan_shuijing1.mp3", "audio/mona/skill/fan_shuijing2.mp3", "audio/mona/skill/fan_shuijing3.mp3", "audio/mona/die/fan_mona1.mp3", "audio/mona/die/fan_mona2.mp3", "audio/mona/die/fan_mona3.mp3",
      "audio/qiqi/skill/fan_due_gain1.mp3", "audio/qiqi/skill/fan_due_gain2.mp3", "audio/qiqi/skill/fan_due_give1.mp3", "audio/qiqi/skill/fan_due_give2.mp3", "audio/qiqi/skill/fan_huihai_voice1.mp3", "audio/qiqi/skill/fan_huihai_voice2.mp3", "audio/qiqi/skill/fan_huihai_voice3.mp3", "audio/qiqi/die/fan_qiqi1.mp3", "audio/qiqi/die/fan_qiqi2.mp3", "audio/qiqi/die/fan_qiqi3.mp3",
      "audio/jean/skill/fan_fengya_voice1.mp3", "audio/jean/skill/fan_fengya_voice2.mp3", "audio/jean/skill/fan_fengya_voice3.mp3", "audio/jean/skill/fan_shiya_heal1.mp3", "audio/jean/skill/fan_shiya_heal2.mp3", "audio/jean/skill/fan_shiya_heal3.mp3", "audio/jean/die/fan_jean1.mp3", "audio/jean/die/fan_jean2.mp3", "audio/jean/die/fan_jean3.mp3",
      "audio/xiao/skill/fan_nuowu_start1.mp3", "audio/xiao/skill/fan_nuowu_start2.mp3", "audio/xiao/skill/fan_nuowu_start3.mp3", "audio/xiao/skill/fan_nuowu_damage1.mp3", "audio/xiao/skill/fan_nuowu_damage2.mp3", "audio/xiao/skill/fan_nuowu_damage3.mp3", "audio/xiao/skill/fan_jiangmo1.mp3", "audio/xiao/skill/fan_jiangmo2.mp3", "audio/xiao/die/fan_xiao1.mp3", "audio/xiao/die/fan_xiao2.mp3", "audio/xiao/die/fan_xiao3.mp3",
      "audio/hutao/die/fan_hutao1.mp3", "audio/hutao/die/fan_hutao2.mp3", "audio/hutao/die/fan_hutao3.mp3",
      "audio/hutao/skill/fan_qiyun_intro.mp3", "audio/hutao/skill/fan_qiyun_sun.mp3", "audio/hutao/skill/fan_qiyun_morning.mp3",
      "audio/hutao/skill/fan_qiyun_name.mp3", "audio/hutao/skill/fan_qiyun_hilichurl.mp3",
      "audio/hutao/skill/fan_qiyun_ningguang.mp3",
      "audio/hutao/skill/fan_wangsheng_customer1.mp3", "audio/hutao/skill/fan_wangsheng_customer2.mp3", "audio/hutao/skill/fan_wangsheng_customer3.mp3",
      "audio/hutao/skill/fan_youdie_burst1.mp3", "audio/hutao/skill/fan_youdie_burst2.mp3", "audio/hutao/skill/fan_youdie_burst3.mp3",
      "audio/ganyu/skill/fan_liutian.mp3", "audio/ganyu/skill/fan_linji.mp3", "audio/ganyu/skill/fan_linji_charge.mp3", "audio/ganyu/skill/fan_xingzuo.mp3", "audio/ganyu/die/fan_ganyu.mp3",
      "audio/xianyun/skill/fan_luanyin1.mp3", "audio/xianyun/skill/fan_luanyin2.mp3",
      "audio/xianyun/skill/fan_luanyin3.mp3", "audio/xianyun/skill/fan_xianzhu1.mp3",
      "audio/xianyun/skill/fan_xianzhu2.mp3", "audio/xianyun/die/fan_xianyun.mp3",
      "audio/nilou/die/fan_nilou.mp3",
      "audio/nilou/skill/fan_chuchen.mp3",
      "audio/nilou/skill/fan_pianzhuan_guard_voice.mp3",
      "audio/nilou/skill/fan_pianzhuan_repeat_voice.mp3",
      "audio/nilou/skill/fan_pianzhuan_yang_voice.mp3",
      "audio/nilou/skill/fan_pianzhuan_yin_voice.mp3",

      "audio/albedo/skill/fan_xiansheng.mp3", "audio/albedo/skill/fan_baie.mp3", "audio/albedo/die/fan_albedo.mp3",
      "audio/albedo/skill/fan_xiansheng_burst.mp3", "audio/albedo/skill/fan_baie_ascension.mp3",
      "audio/raiden/skill/fan_suoguo_voice1.mp3",
      "audio/raiden/skill/fan_suoguo_voice2.mp3",
      "audio/raiden/skill/fan_suoguo_voice3.mp3",
      "audio/raiden/skill/fan_wuxiang_duel_voice.mp3",
      "audio/raiden/skill/fan_wuxiang_hurt_voice.mp3",
      "audio/raiden/skill/fan_wuxiang_ready_voice.mp3",
      "audio/raiden/skill/fan_wuxiang_sha_voice.mp3",
      "audio/raiden/skill/fan_wuxiang_thunder_voice1.mp3",
      "audio/raiden/skill/fan_wuxiang_thunder_voice2.mp3",
      "audio/raiden/skill/fan_wuxiang_thunder_voice3.mp3",
      "audio/raiden/skill/fan_yushen_voice.mp3",
      "audio/raiden/skill/fan_yushen_voice_hm.mp3",
      "audio/raiden/skill/fan_yushen_voice_cooking.mp3",
      "audio/raiden/skill/fan_yushen_awaken_voice.mp3",
      "audio/raiden/die/fan_raiden.mp3",

      "audio/ajax/skill/fan_jingwu_convert_voice2.mp3",
      "audio/ajax/skill/fan_jingwu_gain_voice2.mp3",
      "audio/ajax/skill/fan_jingwu_damage_voice2.mp3",
      "audio/ajax/skill/fan_jingwu_draw_voice2.mp3",
      "audio/ajax/skill/fan_kuanglan2.mp3",
      "audio/ajax/skill/fan_kuanglan_repay_voice1.mp3",
      "audio/ajax/skill/fan_kuanglan_repay_voice2.mp3",
      "audio/ajax/die/fan_ajax2.mp3",
      "audio/ajax/skill/fan_jingwu_convert_voice.mp3", "audio/ajax/skill/fan_jingwu_gain_voice.mp3",
      "audio/ajax/skill/fan_jingwu_damage_voice.mp3", "audio/ajax/skill/fan_jingwu_draw_voice.mp3",
      "audio/ajax/skill/fan_kuanglan.mp3", "audio/ajax/die/fan_ajax1.mp3",
      "audio/mavuika/skill/fan_chihun_gain1.mp3", "audio/mavuika/skill/fan_chihun_gain2.mp3",
      "audio/mavuika/skill/fan_chihun_gain3.mp3", "audio/mavuika/skill/fan_chihun_overflow1.mp3",
      "audio/mavuika/skill/fan_chihun_overflow2.mp3",
      "audio/mavuika/skill/fan_chihun_convert1.mp3", "audio/mavuika/skill/fan_chihun_convert2.mp3",
      "audio/mavuika/skill/fan_fentian_charge1.mp3", "audio/mavuika/skill/fan_fentian_charge2.mp3",
      "audio/mavuika/skill/fan_fentian_fire1.mp3", "audio/mavuika/skill/fan_fentian_fire2.mp3",
      "audio/mavuika/skill/fan_fentian_fire3.mp3", "audio/mavuika/skill/fan_zailin.mp3",
      "audio/mavuika/die/fan_mavuika.mp3",
      "audio/klee/skill/fan_huohua_blast1.mp3", "audio/klee/skill/fan_huohua_blast2.mp3",
      "audio/klee/skill/fan_huohua_blast3.mp3", "audio/klee/skill/fan_taopao1.mp3",
      "audio/klee/skill/fan_taopao2.mp3", "audio/klee/skill/fan_taopao3.mp3", "audio/klee/die/fan_klee.mp3",
      "audio/zhongli/skill/fan_dixin_give1.mp3", "audio/zhongli/skill/fan_dixin_give2.mp3",
      "audio/zhongli/skill/fan_dixin_remove.mp3", "audio/zhongli/skill/fan_qianyan_armor.mp3",
      "audio/zhongli/skill/fan_xianyou.mp3", "audio/zhongli/die/fan_zhongli.mp3",
      "audio/eula/skill/fan_langhua_start.mp3",
      "audio/eula/skill/fan_langhua_low1.mp3", "audio/eula/skill/fan_langhua_low2.mp3",
      "audio/eula/skill/fan_langhua_mid1.mp3", "audio/eula/skill/fan_langhua_mid2.mp3",
      "audio/eula/skill/fan_langhua_high1.mp3", "audio/eula/skill/fan_langhua_high2.mp3",
      "audio/eula/die/fan_eula.mp3",
      "audio/zibai/skill/fan_nichi1.mp3",
      "audio/zibai/skill/fan_nichi2.mp3",
      "audio/zibai/skill/fan_nichi3.mp3",
      "audio/zibai/skill/fan_renjian_full_gift.mp3",
      "audio/zibai/skill/fan_renjian_full_reveal1.mp3",
      "audio/zibai/skill/fan_renjian_full_reveal2.mp3",
      "audio/zibai/skill/fan_renjian_gift.mp3",
      "audio/zibai/skill/fan_renjian_reveal1.mp3",
      "audio/zibai/skill/fan_renjian_reveal2.mp3",
      "audio/zibai/skill/fan_sanxiang_leave_ren1.mp3",
      "audio/zibai/skill/fan_sanxiang_leave_ren2.mp3",
      "audio/zibai/skill/fan_sanxiang_leave_yan.mp3",
      "audio/zibai/skill/fan_sanxiang_leave_yun.mp3",
      "audio/zibai/skill/fan_yanjian_control_voice1.mp3",
      "audio/zibai/skill/fan_yanjian_control_voice2.mp3",
      "audio/zibai/skill/fan_yanjian_damage1.mp3",
      "audio/zibai/skill/fan_yanjian_damage2.mp3",
      "audio/zibai/skill/fan_yanjian_full_control_voice.mp3",
      "audio/zibai/skill/fan_yanjian_full_damage1.mp3",
      "audio/zibai/skill/fan_yanjian_full_damage2.mp3",
      "audio/zibai/skill/fan_yunjian_form1.mp3",
      "audio/zibai/skill/fan_yunjian_form2.mp3",
      "audio/zibai/skill/fan_yunjian_full1.mp3",
      "audio/zibai/skill/fan_yunjian_full2.mp3",
      "audio/zibai/skill/fan_yunjian_full3.mp3",
      "audio/zibai/skill/fan_yunjian_full4.mp3",
      "audio/keqing/skill/fan_kejuan1.mp3", "audio/keqing/skill/fan_kejuan2.mp3",
      "audio/keqing/skill/fan_leili1.mp3", "audio/keqing/skill/fan_leili2.mp3",
      "audio/keqing/skill/fan_yuheng1.mp3", "audio/keqing/skill/fan_yuheng2.mp3", "audio/keqing/die/fan_keqing.mp3",
      "audio/diluc/skill/fan_niyan1.mp3", "audio/diluc/skill/fan_niyan2.mp3", "audio/diluc/skill/fan_niyan3.mp3",
      "audio/diluc/skill/fan_chenxi1.mp3", "audio/diluc/skill/fan_chenxi2.mp3", "audio/diluc/die/fan_diluc.mp3",
      "audio/shenhe/skill/fan_xinzhai.mp3", "audio/shenhe/skill/fan_yizhou1.mp3",
      "audio/shenhe/skill/fan_yizhou_start_extra.mp3",
      "audio/shenhe/skill/fan_yizhou_move_extra1.mp3",
      "audio/shenhe/skill/fan_yizhou_move_extra2.mp3",
      "audio/shenhe/skill/fan_lingwei_extra1.mp3",
      "audio/shenhe/skill/fan_lingwei_extra2.mp3",
      "audio/shenhe/skill/fan_xinzhai_extra1.mp3",
      "audio/shenhe/skill/fan_xinzhai_extra2.mp3",
      "audio/shenhe/skill/fan_yizhou2.mp3", "audio/shenhe/skill/fan_lingwei.mp3", "audio/shenhe/die/fan_shenhe.mp3",
      "audio/shenhe/die/fan_shenhe_extra1.mp3",
      "audio/shenhe/die/fan_shenhe_extra2.mp3",





      "audio/itto/skill/fan_guiwang_damage.mp3",
      "audio/itto/skill/fan_guiwang1.mp3",
      "audio/itto/skill/fan_guiwang2.mp3",
      "audio/itto/skill/fan_guiwang_hurt1.mp3",
      "audio/itto/skill/fan_guiwang_hurt2.mp3",
      "audio/itto/skill/fan_yongyi1.mp3",
      "audio/itto/skill/fan_yongyi2.mp3",
      "audio/itto/skill/fan_yongyi3.mp3",
      "audio/itto/skill/fan_yongyi4.mp3",
      "audio/itto/skill/fan_yongyi_lose1.mp3",
      "audio/itto/skill/fan_yongyi_lose2.mp3",
      "audio/itto/skill/fan_yongyi_lose3.mp3",
      "audio/itto/die/fan_itto.mp3",
      "audio/itto/skill/fan_guiwang_move1.ogg",
      "audio/itto/skill/fan_guiwang_move2.ogg",
      "audio/navia/die/fan_navia1.mp3",
      "audio/navia/die/fan_navia2.mp3",
      "audio/navia/die/fan_navia3.mp3",
      "audio/navia/skill/fan_cijue_start1.mp3",
      "audio/navia/skill/fan_cijue_start2.mp3",
      "audio/navia/skill/fan_cijue_start3.mp3",
      "audio/navia/skill/fan_cijue_start4.mp3",
      "audio/navia/skill/fan_cijue_start5.mp3",
      "audio/navia/skill/fan_cijue_win1.mp3",
      "audio/navia/skill/fan_cijue_win2.mp3",
      "audio/navia/skill/fan_xianjing_damage1.mp3",
      "audio/navia/skill/fan_xianjing_damage2.mp3",
      "audio/navia/skill/fan_xianjing_damage3.mp3",
      "audio/navia/skill/fan_xianjing_other1.mp3",
      "audio/navia/skill/fan_xianjing_other2.mp3",
      "audio/navia/skill/fan_xianjing_other3.mp3",
      "audio/ayaka/die/fan_ayaka.mp3",
      "audio/ayaka/skill/fan_bailu_party.mp3",
      "audio/ayaka/skill/fan_binghua_take_extra1.mp3",
      "audio/ayaka/skill/fan_binghua_take_extra2.mp3",
      "audio/ayaka/die/fan_ayaka_extra1.mp3",
      "audio/ayaka/die/fan_ayaka_extra2.mp3",
      "audio/ayaka/skill/fan_bailu_extra.mp3",
      "audio/ayaka/skill/fan_bailu.mp3",
      "audio/ayaka/skill/fan_binghua_choice.mp3",
      "audio/ayaka/skill/fan_binghua_intro.mp3",
      "audio/ayaka/skill/fan_binghua_take.mp3",
      "audio/ayaka/skill/fan_moran1.mp3",
      "audio/ayaka/skill/fan_moran2.mp3",
      "audio/ayato/die/fan_ayato.mp3",
      "audio/ayato/skill/fan_sanxing1.mp3",
      "audio/ayato/skill/fan_sanxing2.mp3",
      "audio/ayato/skill/fan_xingjia1.mp3",
      "audio/ayato/skill/fan_xingjia2.mp3",
      "audio/columbina/die/fan_columbina.mp3",
      "audio/columbina/skill/fan_sulv1.mp3",
      "audio/columbina/skill/fan_sulv2.mp3",
      "audio/columbina/skill/fan_xiangchou1.mp3",
      "audio/columbina/skill/fan_xiangchou2.mp3",
      "audio/columbina/skill/fan_xiangchou3.mp3",
      "audio/columbina/skill/fan_xiayin1.mp3",
      "audio/columbina/skill/fan_xiayin2.mp3",
      "audio/columbina/skill/fan_xiayin_flip1.mp3",
      "audio/columbina/skill/fan_xiayin_flip2.mp3",
      "audio/columbina/skill/fan_xiayin_use1.mp3",
      "audio/columbina/skill/fan_xiayin_use2.mp3",
      "audio/columbina/skill/fan_zhenyue_reveal.mp3",
      "audio/kinich/skill/fan_xuanlie_sha_voice1.mp3",
      "audio/kinich/skill/fan_xuanlie_sha_voice2.mp3",
      "audio/kinich/skill/fan_xuanlie_gain_voice1.mp3",
      "audio/kinich/skill/fan_xuanlie_gain_voice2.mp3",
      "audio/kinich/skill/fan_shouxing_yang_voice1.mp3",
      "audio/kinich/skill/fan_shouxing_yang_voice2.mp3",
      "audio/kinich/skill/fan_shouxing_yin_voice1.mp3",
      "audio/kinich/skill/fan_shouxing_yin_voice2.mp3",
      "audio/kinich/die/fan_kinich1.mp3",
      "audio/kinich/die/fan_kinich2.mp3",
      "audio/yelan/die/fan_yelan.mp3",
      "audio/yelan/skill/fan_kuanghuo1.mp3",
      "audio/yelan/skill/fan_kuanghuo2.mp3",
      "audio/yelan/skill/fan_yuantu1.mp3",
      "audio/yelan/skill/fan_yuantu2.mp3",
      "audio/yoimiya/die/fan_yoimiya.mp3",
      "audio/yoimiya/skill/fan_huahuo1.mp3",
      "audio/yoimiya/skill/fan_huahuo2.mp3",
      "audio/yoimiya/skill/fan_xiaji.mp3",
      "audio/yoimiya/skill/fan_xiaji_burst1.mp3",
      "audio/yoimiya/skill/fan_xiaji_burst2.mp3",
      "audio/yoimiya/skill/fan_xiaji_burst3.mp3",
    ] },
    intro: "原神原创武将合集。目前收录兹白、芙宁娜、闲云、千织、克洛琳德、希格雯、艾梅莉埃、玛拉妮、基尼奇、希诺宁、恰斯卡、玛薇卡、瓦蕾莎及五种仙家机关。测试版，请先单机验证技能时机。",
    author: "原创武将开发",
    version: "0.2.0",
    editable: false,
    connect: false,
  };
}
