// アップロード前にメディアを軽量化するユーティリティ。
// - 画像: 長辺を maxDim に縮小し WebP/JPEG で再エンコード
// - 動画: 解像度・ビットレートを落として再エンコード（MediaRecorder 利用、対応ブラウザのみ）
// いずれも失敗時・効果が無い場合は元ファイルをそのまま返す（安全側）。

export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  try {
    if (!file.type.startsWith("image/")) return file;
    if (file.type === "image/gif" || file.type === "image/svg+xml") return file; // アニメGIF/SVGは触らない
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob) blob = await toBlob(canvas, "image/jpeg", quality);
    if (!blob || blob.size >= file.size) return file; // 縮まらないなら元のまま
    const ext = blob.type === "image/webp" ? ".webp" : ".jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ext, { type: blob.type });
  } catch {
    return file;
  }
}

export function canCompressVideo(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    typeof MediaRecorder.isTypeSupported === "function" &&
    MediaRecorder.isTypeSupported("video/webm")
  );
}

export async function compressVideo(
  file: File,
  opts: { maxDim?: number; bitrate?: number; onProgress?: (p: number) => void } = {}
): Promise<File> {
  const maxDim = opts.maxDim ?? 1280;
  const bitrate = opts.bitrate ?? 1_200_000;
  if (!canCompressVideo()) return file;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  let actx: AudioContext | null = null;
  try {
    video.src = url;
    video.playsInline = true;
    video.muted = false;
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error("動画を読み込めませんでした"));
    });
    const dur = video.duration || 0;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
    const h = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    const stream = canvas.captureStream(30);
    // 音声は WebAudio 経由で無音のまま録音ストリームへ
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      actx = new AC();
      const srcNode = actx.createMediaElementSource(video);
      const dest = actx.createMediaStreamDestination();
      srcNode.connect(dest); // ctx.destination には繋がない＝スピーカーから音は出ない
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      /* 音声トラックなし等は無視 */
    }

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: "video/webm" })); });

    rec.start(200);
    await video.play();
    let raf = 0;
    const draw = () => {
      ctx.drawImage(video, 0, 0, w, h);
      if (dur && opts.onProgress) opts.onProgress(Math.min(0.99, video.currentTime / dur));
      raf = requestAnimationFrame(draw);
    };
    draw();
    await new Promise<void>((res) => { video.onended = () => res(); });
    cancelAnimationFrame(raf);
    rec.stop();
    const blob = await stopped;
    opts.onProgress?.(1);
    if (!blob || blob.size >= file.size) return file; // 縮まらないなら元のまま
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webm", { type: "video/webm" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
    actx?.close().catch(() => {});
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((res) => canvas.toBlob((b) => res(b), type, quality));
}
