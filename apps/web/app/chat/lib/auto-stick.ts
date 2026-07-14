/**
 * 判断用户是否滚动到消息区底部附近，用于决定流式输出时是否自动跟随。
 */
export function isNearBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  threshold: number,
): boolean {
  return scrollTop + clientHeight >= scrollHeight - threshold;
}
