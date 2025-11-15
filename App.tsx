
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { editImageWithPrompt } from './services/geminiService';
import { UploadIcon, DownloadIcon, SparklesIcon, XIcon, ImagePlusIcon } from './components/Icons';
import { fileToBase64 } from './utils/fileUtils';

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (file: File | null) => {
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setOriginalImage(base64);
      setOriginalFile(file);
      setEditedImage(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('加载图像失败。请尝试其他文件。');
      console.error(err);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleImageUpload(file);
  };
  
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const file = event.clipboardData?.files?.[0] || null;
      if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handleImageUpload]);


  const handleGenerateClick = useCallback(async () => {
    if (!originalImage || !prompt || !originalFile) {
      setError('请上传一张图片并输入提示。');
      return;
    }

    setIsLoading(true);
    setEditedImage(null);
    setError(null);

    try {
      // The base64 string from fileToBase64 includes the data URL prefix, which needs to be removed.
      const base64Data = originalImage.split(',')[1];
      const resultBase64 = await editImageWithPrompt(base64Data, originalFile.type, prompt);
      setEditedImage(`data:${originalFile.type};base64,${resultBase64}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
      setError(`生成图像失败： ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt, originalFile]);

  const handleDownloadClick = () => {
    if (!editedImage) return;

    const link = document.createElement('a');
    link.href = editedImage;
    const fileName = originalFile?.name.replace(/(\.[\w\d_-]+)$/i, '_edited$1') || 'edited-image.png';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const clearImage = () => {
      setOriginalImage(null);
      setOriginalFile(null);
      setEditedImage(null);
      setError(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && originalImage && prompt && !isLoading) {
      event.preventDefault();
      handleGenerateClick();
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!originalImage) {
        setIsDraggingOver(true);
    }
  }, [originalImage]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);

    if (originalImage) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    }
  }, [handleImageUpload, originalImage]);


  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col font-sans">
      <header className="p-4 border-b border-gray-700 w-full text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-100 flex items-center justify-center gap-2">
          <SparklesIcon className="w-6 h-6 text-purple-400" />
          Nano Banana 图像编辑器
        </h1>
        <p className="text-sm text-gray-400 mt-1">使用 Gemini 2.5 Flash Image 和文本提示编辑图像</p>
      </header>
      
      <main className="flex-grow container mx-auto p-4 flex flex-col gap-8">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative" role="alert">
            <strong className="font-bold">错误：</strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="h-full"
            >
            <ImageContainer 
                title="原始图像" 
                imageSrc={originalImage} 
                onClear={clearImage} 
                onUploadClick={() => fileInputRef.current?.click()}
                isDraggingOver={isDraggingOver}
            />
          </div>
          <ImageContainer title="编辑后的图像" imageSrc={editedImage} isLoading={isLoading} />
        </div>
      </main>

      <footer className="sticky bottom-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors shadow-md"
          >
            <UploadIcon className="w-5 h-5" />
            上传图片
          </button>
          <div className="relative flex-grow w-full">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='例如，“添加复古滤镜”或“使其看起来像一幅水彩画”'
              className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 pl-3 pr-28 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              disabled={!originalImage || isLoading}
            />
            <button
              onClick={handleGenerateClick}
              disabled={!originalImage || !prompt || isLoading}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors text-sm"
            >
              <SparklesIcon className="w-4 h-4" />
              生成
            </button>
          </div>
          <button
            onClick={handleDownloadClick}
            disabled={!editedImage || isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors shadow-md"
          >
            <DownloadIcon className="w-5 h-5" />
            下载
          </button>
        </div>
      </footer>
    </div>
  );
};

interface ImageContainerProps {
  title: string;
  imageSrc: string | null;
  isLoading?: boolean;
  onClear?: () => void;
  onUploadClick?: () => void;
  isDraggingOver?: boolean;
}

const ImageContainer: React.FC<ImageContainerProps> = ({ title, imageSrc, isLoading = false, onClear, onUploadClick, isDraggingOver = false }) => {
    return (
        <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-300">{title}</h2>
                {onClear && imageSrc && (
                    <button onClick={onClear} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full bg-gray-700 hover:bg-gray-600">
                        <XIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
            <div className={`flex-grow aspect-square bg-gray-900 rounded-md flex items-center justify-center overflow-hidden relative transition-all duration-200 ${isDraggingOver ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : 'border-2 border-transparent'}`}>
                {isLoading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
                        <p className="mt-4 text-gray-300">生成中...</p>
                    </div>
                )}
                {imageSrc ? (
                    <img src={imageSrc} alt={title} className="max-h-full max-w-full object-contain" />
                ) : (
                    onUploadClick ? (
                        <button onClick={onUploadClick} className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-gray-300 transition-colors">
                            <ImagePlusIcon className="w-16 h-16"/>
                            <span className="font-semibold text-center px-4">
                               {isDraggingOver ? '在此处释放以上传' : '点击上传、粘贴或拖拽图片'}
                            </span>
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-gray-500">
                           <SparklesIcon className="w-16 h-16"/>
                           <span className="font-semibold text-center px-4">您编辑后的图像将显示在此处</span>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default App;
