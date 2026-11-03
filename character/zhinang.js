// 本局公共智囊扩展；保存在对局状态，不写入用户的持久配置。
export function installSharedZhinang(get, currentStatus) {
  if (get.zhinangs.fanSharedZhinang) return;
  const original = get.zhinangs;
  function zhinangs(...args) {
    return [...new Set([...original.apply(this, args), ...(currentStatus().fan_miaosuan_names || [])])];
  }
  zhinangs.fanSharedZhinang = true;
  get.zhinangs = zhinangs;
}
