import { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholderText?: string;
  disabled?: boolean;
};

const MAX_BYTES = 3 * 1024 * 1024;

export default function ImageUploadBox({ value, onChange, label, placeholderText = 'Click to upload or replace image', disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const readFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image is too large. Please crop or compress it below 3 MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => onChange(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold uppercase tracking-wider">{label}</label>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')} disabled={disabled}>
            <X className="mr-2 h-4 w-4" /> Remove
          </Button>
        )}
      </div>
      <button type="button" onClick={openPicker} disabled={disabled} className="w-full rounded-2xl border border-dashed border-border bg-card p-3 text-left">
        {value ? <img src={value} alt={label} className="h-56 w-full rounded-xl object-cover" /> : <div className="flex h-56 items-center justify-center rounded-xl bg-background text-muted-foreground"><ImageIcon className="mr-2 h-6 w-6" /> {placeholderText}</div>}
      </button>
      <div className="flex gap-2">
        <Button type="button" onClick={openPicker} disabled={disabled} className="flex-1"><Upload className="mr-2 h-4 w-4" /> Replace Image</Button>
        {value && <Button type="button" variant="outline" onClick={() => onChange('')} disabled={disabled}>Keep Current Image</Button>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
      <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 3 MB.</p>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}