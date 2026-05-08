import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  value: string;
  onChange: (base64: string) => void;
  className?: string;
  label?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageUpload({ value, onChange, className = '', label }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image is too large (max 5MB). Please compress or crop it.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div className={className}>
      {label && <p className="text-sm font-bold uppercase tracking-wider mb-2">{label}</p>}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-border group bg-card aspect-square max-w-sm cursor-pointer" onClick={openPicker}>
          <img src={value} alt="Upload preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); openPicker(); }}
            >
              Replace Image
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
            >
              Remove Image
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center transition-colors aspect-square max-w-sm cursor-pointer
            ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-card'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={openPicker}
        >
          <Upload className={`w-12 h-12 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="font-bold text-lg mb-2">Click or drag image to upload</p>
          <p className="text-sm text-muted-foreground">JPEG, PNG, WebP up to 5MB</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="text-sm font-bold text-destructive mt-2">{error}</p>}
    </div>
  );
}
