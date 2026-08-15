// 图片工具：读取、缩放、裁剪

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function isImageAvatar(value) {
  return typeof value === "string" && value.startsWith("data:");
}

// 等比缩小图片，用于聊天附件/头像/表情包，避免撑爆 localStorage
export async function downscaleImage(dataUrl, maxDim = 1280, quality = 0.85) {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

// 按裁剪参数从原图中心裁出正方形
export async function cropToSquare(dataUrl, { containerSize, scale, offsetX, offsetY, outputSize = 256 }) {
  const img = await loadImage(dataUrl);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const fit = Math.max(containerSize / W, containerSize / H);
  const displayW = W * fit * scale;
  const displayH = H * fit * scale;
  const maxX = Math.max(0, (displayW - containerSize) / 2);
  const maxY = Math.max(0, (displayH - containerSize) / 2);
  const dx = Math.max(-maxX, Math.min(maxX, offsetX));
  const dy = Math.max(-maxY, Math.min(maxY, offsetY));
  const cx = displayW / 2 + dx;          // 容器中心在图片显示坐标里的位置
  const cy = displayH / 2 + dy;
  const sx = (cx - containerSize / 2) / (fit * scale); // 对应原图坐标
  const sy = (cy - containerSize / 2) / (fit * scale);
  const s = containerSize / (fit * scale);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  canvas.getContext("2d").drawImage(img, sx, sy, s, s, 0, 0, outputSize, outputSize);
  return canvas.toDataURL("image/jpeg", 0.9);
}