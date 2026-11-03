// 详情页汇总台词及顺序试听；对局 trySkillAudio 显式传入 args，保留分支播放池。
export const skillVoiceGroups = {
  fan_jiyu: ["fan_jiyu"],
  fan_yuxiu: ["fan_yuxiu", "fan_yuxiu_use"],
  fan_feiren: ["fan_feiren"],
  fan_huanxi: ["fan_huanxi", "fan_huanxi_wrong", "fan_huanxi_right"],
  fan_moshu: ["fan_moshu"],
  fan_yilong: ["fan_yilong_voice"],
  fan_shenpan: ["fan_shenpan_voice"],
  fan_leiyu: ["fan_leiyu"],
  fan_polang: ["fan_polang_gain_voice", "fan_polang_heavy_voice", "fan_polang_release_voice"],
  fan_jingyang: ["fan_jingyang", "fan_jingyang_hehu"],
  fan_miaosuan: ["fan_miaosuan_select_voice", "fan_miaosuan_gain_voice", "fan_miaosuan_chengshi_voice"],
  fan_haiji: ["fan_haiji"],
  fan_wentai: ["fan_wentai"], fan_miyuan: ["fan_miyuan_charge", "fan_miyuan_use_audio", "fan_miyuan_guohe_audio"],
  fan_shanyao: ["fan_shanyao_loss_success", "fan_shanyao_heal_success"], fan_huanyan: ["fan_huanyan"], fan_duqi: ["fan_duqi"],
  fan_zhongyu: ["fan_zhongyu_guard", "fan_zhongyu_success", "fan_zhongyu_failure"],
  fan_huaqiu: ["fan_huaqiu_start_voice", "fan_huaqiu_guard_voice", "fan_huaqiu_end_voice"],
  fan_wenshou: ["fan_wenshou_select_voice", "fan_wenshou_bless_voice", "fan_wenshou_punish_voice", "fan_wenshou_gain_voice"],
  fan_huanjing: ["fan_huanjing_voice"],
  fan_lanyin: [],
  fan_tiaoting: ["fan_tiaoting"], fan_xixin: ["fan_xixin"],
  fan_xuanlie: ["fan_xuanlie_sha_voice", "fan_xuanlie_gain_voice"],
  fan_shouxing: ["fan_shouxing_yang_voice", "fan_shouxing_yin_voice"],
  fan_zhuying: ["fan_zhuying_gain_voice", "fan_zhuying"], fan_canguang: ["fan_canguang"],
  fan_anshen: ["fan_anshen_start_voice", "fan_anshen_give_voice", "fan_anshen_heal_voice"],
  fan_chanyi: ["fan_chanyi_voice"],
  fan_tianhu: ["fan_tianhu_yang_voice", "fan_tianhu_yin_voice"],
  fan_yingxiang: ["fan_yingxiang_voice"],
  fan_mingshen: ["fan_mingshen_voice", "fan_mingshen_easter_voice"],
  fan_qingzhan: ["fan_qingzhan", "fan_qingzhan_success"],
  fan_songshi: ["fan_songshi_voice"],
  fan_xiecui: ["fan_xiecui_voice"],
  fan_yuxun: ["fan_yuxun_record_voice", "fan_yuxun_convert_voice"],
  fan_chiyi: ["fan_chiyi"],
  fan_luhuo: ["fan_luhuo_start", "fan_luhuo_draw", "fan_luhuo_attack"],
  fan_ruyue: ["fan_ruyue_rise", "fan_ruyue_fall", "fan_ruyue_convert_voice"],
  fan_jianliu: ["fan_jianliu_backup"],
  fan_guiji: ["fan_guiji", "fan_guiji_capture"],
  fan_dianyu: ["fan_dianyu", "fan_dianyu_end_voice", "fan_dianyu_gain_voice"],
  fan_xingmie: ["fan_xingmie"],
  fan_sp_xigou: ["fan_xigou_number", "fan_xigou_suit", "fan_xigou_type"],
  fan_sp_wanli: ["fan_wanli_choice"],
  fan_sp_yaoyue: ["fan_yaoyue_voice"],
  fan_xigou: ["fan_xigou_number", "fan_xigou_suit", "fan_xigou_type", "fan_xigou_view"],
  fan_wanli: ["fan_wanli_choice", "fan_wanli_beishui"],
  fan_yaoyue: ["fan_yaoyue_voice"],
  fan_bowen: ["fan_bowen_reveal_voice", "fan_bowen_convert_voice"],
  fan_shizhi: ["fan_shizhi_draw_voice", "fan_shizhi_cancel_voice"],
  fan_tianlin: ["fan_tianlin_before", "fan_tianlin_after", "fan_tianlin_draw_voice"],
  fan_duanyu: ["fan_duanyu_guard", "fan_duanyu_success", "fan_duanyu_failure"],
  fan_xuanji: ["fan_xuanji_story"],
  fan_yingxin: ["fan_yingxin_start", "fan_yingxin_draw1", "fan_yingxin_draw2"],
  fan_zhuyao: ["fan_zhuyao_lose1", "fan_zhuyao_lose2", "fan_zhuyao_draw1", "fan_zhuyao_draw2", "fan_zhuyao_chengshi"],
  fan_miyan: ["fan_miyan_use1", "fan_miyan_use2", "fan_miyan_turn1", "fan_miyan_turn2"],
  fan_citlali_lianying: ["fan_citlali_lianying1", "fan_citlali_lianying2"],
  fan_jiliu: ["fan_jiliu"], fan_shuijing: ["fan_shuijing"],
  fan_due: ["fan_due_gain1", "fan_due_gain2", "fan_due_give1", "fan_due_give2"],
  fan_huihai: ["fan_huihai_voice1", "fan_huihai_voice2", "fan_huihai_voice3"],
  fan_fengya: ["fan_fengya_voice1", "fan_fengya_voice2", "fan_fengya_voice3"],
  fan_shiya: ["fan_shiya_heal1", "fan_shiya_heal2", "fan_shiya_heal3", "fan_fengya_voice1", "fan_fengya_voice2", "fan_fengya_voice3"],
  fan_cijue: ["fan_cijue_start", "fan_cijue_win"],
  fan_xianjing: ["fan_xianjing_damage", "fan_xianjing_other"], fan_cimei: [],
  fan_nuowu: ["fan_nuowu_start", "fan_nuowu_damage"], fan_jiangmo: ["fan_jiangmo"],
  fan_qiyun: ["fan_qiyun_intro", "fan_qiyun_sun", "fan_qiyun_morning", "fan_qiyun_name", "fan_qiyun_hilichurl", "fan_qiyun_ningguang"],
  fan_wangsheng: ["fan_wangsheng_customer1", "fan_wangsheng_customer2", "fan_wangsheng_customer3"],
  fan_youdie: ["fan_youdie_burst"],
  fan_liutian: ["fan_liutian"], fan_linji: ["fan_linji", "fan_linji_charge"], fan_xingzuo: ["fan_xingzuo"],
  fan_luanyin: ["fan_luanyin"], fan_xianzhu: ["fan_xianzhu"],
  fan_pianzhuan: ["fan_pianzhuan_convert_voice", "fan_pianzhuan_repeat_voice"],
  fan_chuchen: ["fan_chuchen"],
  fan_xiansheng: ["fan_xiansheng"], fan_baie: ["fan_baie"],
  fan_wuxiang: ["fan_wuxiang_ready_voice", "fan_wuxiang_hurt_voice", "fan_wuxiang_sha_voice", "fan_wuxiang_duel_voice", "fan_wuxiang_thunder_voice"],
  fan_suoguo: ["fan_suoguo_voice"], fan_yushen: ["fan_yushen_awaken_voice", "fan_yushen_voice"],
  fan_jingwu: ["fan_jingwu_convert_voice", "fan_jingwu_gain_voice", "fan_jingwu_damage_voice", "fan_jingwu_draw_voice"],
  fan_kuanglan: ["fan_kuanglan", "fan_kuanglan_repay_voice"],
  fan_chihun: ["fan_chihun_gain", "fan_chihun_overflow", "fan_chihun_convert"],
  fan_fentian: ["fan_fentian_charge", "fan_fentian_fire"],
  fan_zailin: ["fan_zailin"],
  fan_huohua: ["fan_huohua_blast"], fan_taopao: ["fan_taopao", "fan_huohua_blast"],
  fan_guiwang: ["fan_guiwang_damage", "fan_guiwang_hurt", "fan_guiwang_move", "fan_guiwang"], fan_yongyi: ["fan_yongyi", "fan_yongyi_lose"],
  fan_dixin: ["fan_dixin_give", "fan_dixin_remove"],
  fan_qianyan: ["fan_qianyan_armor"], fan_xianyou: ["fan_xianyou"],
  fan_bailu: ["fan_bailu"],
  fan_binghua: ["fan_binghua", "fan_binghua_choice", "fan_binghua_take"],
  fan_moran: ["fan_moran"],
  fan_sanxing: ["fan_sanxing"], fan_xingjia: ["fan_xingjia"],
  fan_kejuan: ["fan_kejuan"], fan_leili: ["fan_leili"], fan_yuheng: ["fan_yuheng"],
  fan_niyan: ["fan_niyan"], fan_chenxi: ["fan_chenxi"],
  fan_yizhou: ["fan_yizhou", "fan_yizhou_move"],
  fan_xinzhai: ["fan_xinzhai"], fan_lingwei: ["fan_lingwei"],
  fan_kuanghuo: ["fan_kuanghuo"], fan_yuantu: ["fan_yuantu"],
  fan_zhangdeng: ["fan_zhangdeng", "fan_zhangdeng_use_voice"], fan_moke: ["fan_moke_voice"],
  fan_xiaji: ["fan_xiaji", "fan_xiaji_burst"], fan_huahuo: ["fan_huahuo"],
  fan_xiangchou: ["fan_xiangchou"],
  fan_xiayin: ["fan_xiayin_use", "fan_xiayin_flip"],
  fan_sulv: ["fan_sulv"], fan_zhenyue: [],
  fan_langhua: ["fan_langhua_start", "fan_langhua_low", "fan_langhua_mid", "fan_langhua_high"],
  fan_nichi: ["fan_nichi"],
  fan_sanxiang: [],
  fan_yunjian: ["fan_yunjian_form", "fan_yunjian_full", "fan_sanxiang_leave_yun"],
  fan_yanjian: ["fan_yanjian_damage", "fan_yanjian_control_voice", "fan_yanjian_full_damage", "fan_yanjian_full_control_voice", "fan_sanxiang_leave_yan"],
  fan_renjian: ["fan_renjian_reveal", "fan_renjian_gift", "fan_renjian_full_reveal", "fan_renjian_full_gift", "fan_sanxiang_leave_ren"],
  // 酒诗使用温迪专属语音，翻面取牌不重复播放。
  fan_yinyou: ["fan_yinyou"], fan_jiushi: ["fan_jiushi"],
};

export function installSkillVoices(get) {
  const Audio = get.Audio;
  if (!Audio || Audio.skill.fanSkillVoices) return;
  const original = Audio.skill;
  function skill(options) {
    const result = original.call(this, options);
    const group = skillVoiceGroups[options.skill];
    if (group && options.info === undefined && options.args === undefined) {
      // 使用原方法解析各分支，绕过汇总层以免自引用；不读取或改变对局状态。
      const branches = group.map(id => original.call(this, { ...options, skill: id }));
      const lines = branches.flatMap(audio => audio.textList);
      // 原生详情调用不带 args/info 键；trySkillAudio 即便参数为空也会带这两个键。
      if (!Object.hasOwn(options, "args") && !Object.hasOwn(options, "info")) {
        const files = [...new Set(branches.flatMap(audio => audio.fileList))];
        Object.defineProperty(result, "fileList", { get: () => files.slice() });
      }
      Object.defineProperty(result, "textList", {
        get: () => lines.length ? [...new Set(lines)] : ["此技能暂无语音。"],
      });
    }
    return result;
  }
  skill.fanSkillVoices = true;
  Audio.skill = skill;
}
