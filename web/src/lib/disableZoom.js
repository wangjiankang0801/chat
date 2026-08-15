// 阻止手机浏览器缩放：
// iOS Safari 会忽略 user-scalable=no（无障碍设计），这里用手势拦截兜底。
// - 双指滑动（pinch）→ 拦截 touchmove
// - 部分安卓内核的 gesturestart → 拦截
// 注意：不拦截单指滑动，聊天列表滚动不受影响。
if (typeof document !== "undefined") {
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  document.addEventListener("gesturestart", (e) => e.preventDefault());
}