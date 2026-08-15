import { useEffect, useRef, useState } from "react";
import { loadImage, cropToSquare } from "../lib/image.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function ImageCropModal({ src, outputSize = 256, onConfirm, onCancel }) {
  const boxRef = useRef(null);
  const [boxSize, setBoxSize] = useState(0);
  const [imgSize, setImgSize] = useState(null); // 原图尺寸
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const gesture = useRef(null);

  useEffect(() => {
    const measure = () => {
      const w = boxRef.current?.clientWidth;
      setBoxSize(w && w > 0 ? w : Math.min(window.innerWidth - 40, 340)); // 兜底值
    };
    measure();
    window.addEventListener("resize", measure);

    loadImage(src)
      .then((img) => {
        setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        // 图片加载完成后再量一次，确保容器已经渲染出来
        requestAnimationFrame(measure);
      })
      .catch(() => alert("图片加载失败，请换一张 JPEG/PNG 图片"));

    return () => window.removeEventListener("resize", measure);
  }, [src]);

  // 鼠标滚轮缩放（原生监听才能 preventDefault）
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e) => {
      e.preventDefault();
      setScale((s) => clamp(s - e.deltaY * 0.0015, 1, 5));
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, []);

  const ready = imgSize && boxSize > 0;
  const fit = ready ? Math.max(boxSize / imgSize.w, boxSize / imgSize.h) : 1;
  const displayW = ready ? imgSize.w * fit * scale : 0;
  const displayH = ready ? imgSize.h * fit * scale : 0;
  const maxX = ready ? Math.max(0, (displayW - boxSize) / 2) : 0;
  const maxY = ready ? Math.max(0, (displayH - boxSize) / 2) : 0;
  const ox = clamp(offset.x, -maxX, maxX);
  const oy = clamp(offset.y, -maxY, maxY);

  function setOffsetClamped(next) {
    setOffset({ x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) });
  }

  // —— 触屏手势：单指拖动 / 双指缩放 ——
  function onTouchStart(e) {
    if (!ready) return;
    if (e.touches.length === 1) {
      const t = e.touches[0];
      gesture.current = { type: "pan", x: t.clientX, y: t.clientY, ox, oy };
    } else if (e.touches.length === 2) {
      const [a, b] = e.touches;
      gesture.current = { type: "pinch", dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), scale };
    }
  }
  function onTouchMove(e) {
    if (!gesture.current) return;
    e.preventDefault();
    if (gesture.current.type === "pan" && e.touches.length === 1) {
      const t = e.touches[0];
      setOffsetClamped({ x: gesture.current.ox + (t.clientX - gesture.current.x), y: gesture.current.oy + (t.clientY - gesture.current.y) });
    } else if (gesture.current.type === "pinch" && e.touches.length === 2) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      setScale(clamp(gesture.current.scale * (dist / gesture.current.dist), 1, 5));
    }
  }
  function onTouchEnd() {
    gesture.current = null;
  }

  // —— 鼠标拖动（桌面调试用） ——
  function onMouseDown(e) {
    if (!ready) return;
    gesture.current = { type: "pan", x: e.clientX, y: e.clientY, ox, oy };
    const onMove = (ev) => {
      setOffsetClamped({ x: gesture.current.ox + (ev.clientX - gesture.current.x), y: gesture.current.oy + (ev.clientY - gesture.current.y) });
    };
    const onUp = () => {
      gesture.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  async function handleConfirm() {
    if (!ready) return;
    setBusy(true);
    try {
      const out = await cropToSquare(src, { containerSize: boxSize, scale, offsetX: ox, offsetY: oy, outputSize });
      onConfirm(out);
    } catch (err) {
      alert("裁剪失败：" + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">调整头像</div>
        <div
          className="crop-box"
          ref={boxRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          {ready ? (
            <img
              className="crop-img"
              src={src}
              alt=""
              draggable={false}
              style={{
                width: displayW,
                height: displayH,
                marginLeft: -displayW / 2,
                marginTop: -displayH / 2,
                transform: `translate(${ox}px, ${oy}px)`,
              }}
            />
          ) : (
            <div className="crop-loading">图片加载中…</div>
          )}
          <div className="crop-frame" />
        </div>
        <div className="crop-controls">
          <div className="crop-row">
            <span>缩放</span>
            <input type="range" min="1" max="5" step="0.01" value={scale} disabled={!ready} onChange={(e) => setScale(Number(e.target.value))} />
          </div>
          <p className="crop-tip">单指拖动图片，双指缩放，也可以拖上面的滑杆</p>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>取消</button>
          <button className="btn primary" onClick={handleConfirm} disabled={busy || !ready}>{busy ? "处理中…" : "完成"}</button>
        </div>
      </div>
    </div>
  );
}