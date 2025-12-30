
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_SLIDES } from './constants.ts';
import { SlideData } from './types.ts';
import Slide from './components/Slide.tsx';

const App: React.FC = () => {
  const [slides, setSlides] = useState<SlideData[]>(INITIAL_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const clickTimer = useRef<number | null>(null);

  const totalSlides = slides.length;
  
  // 核心逻辑配置：索引必须与 constants.ts 中的 ID 保持一致
  const QUIZ_BOARD_INDEX = 17; // 第18页（索引17）是知识问答面板
  const QUIZ_START_INDEX = 18; // 19-43页是具体的题目
  const QUIZ_END_INDEX = 42;
  const NEXT_AFTER_QUIZ = 43;  // 44页是立BA互动

  const jumpToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      if (index >= QUIZ_START_INDEX && index <= QUIZ_END_INDEX) {
        setSlides(prev => {
          const next = [...prev];
          next[index] = { ...next[index], visited: true };
          return next;
        });
      }
      setCurrentIndex(index);
    }
  }, [totalSlides]);

  const nextSlide = useCallback(() => {
    // 如果在问答面板，按下一页直接跳过所有题目到后面的互动
    if (currentIndex === QUIZ_BOARD_INDEX) {
      jumpToSlide(NEXT_AFTER_QUIZ);
    } 
    // 如果正在看具体的题目，按下一页（或点击背景）应该回到问答面板，方便选下一题
    else if (currentIndex >= QUIZ_START_INDEX && currentIndex <= QUIZ_END_INDEX) {
      jumpToSlide(QUIZ_BOARD_INDEX);
    } 
    else {
      setCurrentIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
    }
  }, [currentIndex, jumpToSlide, NEXT_AFTER_QUIZ, totalSlides]);

  const prevSlide = useCallback(() => {
    if (currentIndex === NEXT_AFTER_QUIZ) {
      jumpToSlide(QUIZ_BOARD_INDEX);
    } else {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  }, [currentIndex, jumpToSlide]);

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // 如果点击的是控制面板、按钮或正在编辑文字，不触发翻页
    if (target.closest('.controls-panel') || target.closest('button')) return;
    if (document.activeElement?.getAttribute('contenteditable') === 'true') return;

    if (clickTimer.current) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    } else {
      clickTimer.current = window.setTimeout(() => {
        nextSlide();
        clickTimer.current = null;
      }, 250);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`全屏失败: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.getAttribute('contenteditable') === 'true') return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          prevSlide();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'Home':
          setCurrentIndex(0);
          break;
        case 'End':
          setCurrentIndex(totalSlides - 1);
          break;
        case 'b':
        case 'B':
          jumpToSlide(QUIZ_BOARD_INDEX);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, totalSlides, jumpToSlide]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const calculateScale = () => {
      const baseWidth = 1024;
      const baseHeight = 768;
      const availableWidth = window.innerWidth - 40;
      const availableHeight = window.innerHeight - 40;
      setScale(Math.min(availableWidth / baseWidth, availableHeight / baseHeight));
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  const handleUpdateSlide = (updatedSlide: SlideData) => {
    setSlides(prev => {
        const newSlides = [...prev];
        const idx = newSlides.findIndex(s => s.id === updatedSlide.id);
        if (idx !== -1) newSlides[idx] = updatedSlide;
        return newSlides;
    });
  };

  return (
    <div 
      className={`min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center relative ${isFullscreen ? 'cursor-none' : ''}`}
      onClick={handleContainerClick}
    >
      <div className={`controls-panel fixed top-4 right-4 z-50 flex gap-2 transition-opacity ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg backdrop-blur-md border border-white/20 px-4 transition-all"
        >
          {isFullscreen ? '退出全屏' : '全屏播放'}
        </button>
      </div>

      <div className={`controls-panel fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-2 px-6 rounded-full transition-opacity ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} disabled={currentIndex === 0} className="p-2 text-white hover:bg-white/10 rounded-full disabled:opacity-20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        <div className="flex gap-1 overflow-x-auto max-w-md scrollbar-hide px-2">
            {slides.map((slide, idx) => {
                const isQuizQuestion = idx >= QUIZ_START_INDEX && idx <= QUIZ_END_INDEX;
                // 底部进度条隐藏所有的具体题目，只显示主流程
                if (isQuizQuestion) return null;
                return (
                    <div 
                        key={idx}
                        className={`h-1.5 shrink-0 rounded-full transition-all cursor-pointer ${idx === currentIndex ? 'bg-yellow-400 w-8' : (slide.visited ? 'bg-white/10 w-3' : 'bg-white/30 hover:bg-white/50 w-3')}`}
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                    />
                );
            })}
        </div>

        <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} disabled={currentIndex === totalSlides - 1} className="p-2 text-white hover:bg-white/10 rounded-full disabled:opacity-20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <span className="text-white/60 text-sm font-medium ml-4 border-l border-white/20 pl-4">
            {currentIndex + 1} / {totalSlides}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center w-full h-full p-4 overflow-hidden">
        <Slide 
          key={slides[currentIndex].id} 
          data={slides[currentIndex]} 
          allSlides={slides}
          scale={scale} 
          onUpdate={handleUpdateSlide}
          onJump={jumpToSlide}
        />
      </div>

      {!isFullscreen && (
        <div className="fixed bottom-4 left-4 text-white/30 text-xs flex flex-col gap-1">
          <div>提示：空格/方向键/点击背景翻页 | F 全屏 | B 返回问答面板</div>
          <div className="font-bold text-yellow-500/80">双击文字区域进行即时修改</div>
        </div>
      )}
    </div>
  );
};

export default App;
