import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  busy?: boolean;
};

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });
  const size = Math.min(800, Math.max(256, Math.round(area.width)));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode image"))), "image/jpeg", 0.9),
  );
}

export function ImageCropModal({ imageSrc, onCancel, onConfirm, busy }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const [working, setWorking] = useState(false);

  const handleConfirm = async () => {
    if (!area) {
      toast.error("Adjust the crop first");
      return;
    }
    setWorking(true);
    try {
      const blob = await getCroppedBlob(imageSrc, area);
      await Promise.resolve(onConfirm(blob));
    } catch (err) {
      console.error("Crop failed", err);
      toast.error(err instanceof Error ? err.message : "Could not crop image");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div className="relative w-[90vw] max-w-md rounded-lg bg-card p-4 shadow-xl md:w-[480px]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="font-heading text-lg text-ink">Position photo</h3>
        <p className="mt-1 text-xs text-muted-foreground">Drag to reposition. Use the slider to zoom.</p>

        <div className="relative mt-3 h-72 w-full overflow-hidden rounded bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-gold"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-ink hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || working || !area}
            className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy || working ? "Uploading…" : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
