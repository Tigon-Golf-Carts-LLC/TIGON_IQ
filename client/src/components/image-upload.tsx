import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  fallbackIcon?: React.ReactNode;
  testId?: string;
}

export function ImageUpload({ value, onChange, label = "Upload Image", fallbackIcon, testId }: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(value || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync preview state when value prop changes (handles async data loading)
  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onChange(dataUrl);
      setIsUploading(false);
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Failed to read the image file. Please try again.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview("");
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({
      title: "Image removed",
      description: "The image has been removed.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20">
          {preview ? (
            <AvatarImage src={preview} alt={label} />
          ) : (
            <AvatarFallback className="bg-muted">
              {fallbackIcon || <Upload className="h-8 w-8 text-muted-foreground" />}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            data-testid={testId ? `${testId}-input` : undefined}
          />
          
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid={testId ? `${testId}-upload` : undefined}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : label}
            </Button>
            
            {preview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                data-testid={testId ? `${testId}-remove` : undefined}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            PNG, JPG, GIF up to 2MB
          </p>
        </div>
      </div>
    </div>
  );
}
