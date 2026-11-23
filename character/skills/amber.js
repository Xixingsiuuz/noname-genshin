import { game, get, ui } from "../../../../noname.js";
export const remembered = player => player.storage.fan_zhencha || [];
export const eligible = (player, target) => target.getCards("h").filter(card => remembered(player).includes(card));
export default {
  fan_zhencha: {
    audio: false, locked: false, enable: "phaseUse", usable: 1,
    filterTarget: (card, player, target) => target !== player && target.countCards("h") > 0,
    async content(event, trigger, player) {
      const target = event.targets[0];
      if (!target.isIn()) return;
      const count = Math.min(target.countCards("h"), player.getAttackRange());
      if (count <= 0) return;
      const viewed = await player.choosePlayerCard(target, "h", [1, count], "侦察：选择要观看的手牌")
        .set("ai", button => remembered(player).includes(button.link) ? 2 : 1).forResult();
      if (!viewed.bool || !target.isIn()) return;
      const cards = viewed.cards.filter(card => target.getCards("h").includes(card));
      if (!cards.length) return;
      // 先保存观看前的标记，首次观看的牌不能在本次交出。
      const marked = cards.filter(card => remembered(player).includes(card));
      await player.viewCards("侦察", cards);
      let remaining = marked.slice();
      // 参照谋陆逊【连营】：每次联合选择一批牌和接收者，结算后继续分配。
      while (remaining.length && player.isIn() && target.isIn()) {
        remaining = remaining.filter(card => target.getCards("h").includes(card));
        if (!remaining.length) break;
        const gift = await player.chooseButtonTarget({
          createDialog: ["侦察：选择要分配的牌和角色", remaining],
          forced: true, allowChooseAll: true, selectButton: [1, remaining.length],
          filterTarget: (card, player, current) => current.isIn(),
          ai1: button => get.value(button.link, target),
          ai2(current) {
            const selected = ui.selected.buttons.map(button => button.link);
            return selected.reduce((sum, card) => sum + get.value(card, current), 0)
              * get.attitude(player, current) / (1 + current.countCards("h") * .15);
          },
        }).forResult();
        const recipient = gift.targets?.[0];
        if (!gift.bool || !recipient?.isIn() || !target.isIn() || !player.isIn()) break;
        const giving = gift.links;
        if (!giving?.length || !giving.every(card => remaining.includes(card) && target.getCards("h").includes(card))) break;
        remaining = remaining.filter(card => !giving.includes(card));
        if (recipient !== target) await target.give(giving, recipient);
      }
      // 标记属于侦察的实体牌记录，不借用会在离手时清除的普通 gaintag。
      const memory = player.storage.fan_zhencha || (player.storage.fan_zhencha = []);
      for (const card of cards) if (!memory.includes(card)) memory.push(card);
      // 普通手牌标签供持牌者查看；eternal 前缀使其随实体牌保留。
      // 不使用 visible_ 前缀，避免将暗置手牌变为明置牌。
      for (const card of cards) {
        const owner = get.owner(card);
        if (owner) owner.addGaintag([card], "eternal_fan_zhencha");
      }
    },
    ai: { order: 8, result: { target: (player, target) => -Math.min(3, target.countCards("h")) } },
  },
  fan_guanjun: {
    audio: false, locked: true, forced: true,
    trigger: { global: "roundStart" },
    async content(event, trigger, player) {
      if (player.isIn()) await player.phase("fan_guanjun");
    },
    ai: { threaten: 2.5 },
  },
};
