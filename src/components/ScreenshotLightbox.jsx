import { useState, useEffect, useCallback } from 'react';

export default function ScreenshotLightbox({ screenshots, initialIndex, onClose, appName }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const total = screenshots.length;

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-300">
            {appName} — Screenshot {currentIndex + 1} of {total}
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl cursor-pointer transition-colors w-8 h-8 flex items-center justify-center"
          >
            &times;
          </button>
        </div>

        <div className="flex items-center justify-center relative">
          {total > 1 && currentIndex > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg cursor-pointer transition-colors"
            >
              &#9664;
            </button>
          )}

          <img
            src={screenshots[currentIndex]}
            alt={`${appName} screenshot ${currentIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />

          {total > 1 && currentIndex < total - 1 && (
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg cursor-pointer transition-colors"
            >
              &#9654;
            </button>
          )}
        </div>

        {total > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {screenshots.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-zinc-500'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
