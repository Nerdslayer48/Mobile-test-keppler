import { useRef, useState } from "react";
import { FiBriefcase, FiUser, FiCamera } from "react-icons/fi";
import type { ClientInput } from "../../types/client";

export function ClientPicturePicker({ value, clientType, onChange, subject = 'Client' }: {
  subject?: string;
  value?: string;
  clientType: ClientInput["clientType"];
  onChange: (picture: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const DefaultIcon = clientType === "company" ? FiBriefcase : FiUser;

  async function upload(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setLoading(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to process image");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      onChange(canvas.toDataURL("image/webp", 0.85));
    } catch {
      setError("Unable to open this image. Please choose another file.");
    } finally {
      URL.revokeObjectURL(url);
      setLoading(false);
    }
  }

  return (
    <div className="w-[210px] shrink-0">
      <input ref={input} type="file" accept="image/*" className="hidden" aria-label={`Choose ${subject.toLowerCase()} profile picture`}
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }} />
      <button type="button" disabled={loading} onClick={() => input.current?.click()}
        aria-label={`${value ? 'Change' : 'Add'} ${subject.toLowerCase()} profile picture`}
        className="relative flex h-[210px] w-[210px] items-center justify-center overflow-hidden rounded-[6px] border border-button-border bg-button-bg text-text-secondary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60">
        {value ? <img src={value} alt={`${subject} profile`} className="h-full w-full object-cover" /> : <DefaultIcon size={72} aria-hidden="true" />}
        <span className="absolute bottom-0 left-0 flex w-full items-center justify-center gap-2 bg-background/90 py-2 text-sm">
          <FiCamera aria-hidden="true" />{loading ? "Loading…" : value ? "Change picture" : "Add picture"}
        </span>
      </button>
      {value && <button type="button" disabled={loading} className="mt-2 text-sm text-text-secondary hover:underline" onClick={() => { setError(""); onChange(""); }}>Remove picture</button>}
      {error && <p role="alert" className="mt-2 text-sm text-text-secondary">{error}</p>}
    </div>
  );
}
