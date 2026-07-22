import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from './VideoModal.module.css';

interface VideoModalProps {
  /** Controls whether the modal is visible */
  isOpen: boolean;
  /** Called when the user closes the modal (X, backdrop click, or Escape) */
  onClose: () => void;
  /** Path to the video file — small enough to bundle, e.g. import from /src/assets */
  src: string;
  /** Optional poster frame shown before playback starts */
  poster?: string;
  /** Optional title shown in the top bar */
  title?: string;
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  src,
  poster,
  title = 'Watch Aselar',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  // Reset + autoplay whenever the modal opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      const v = videoRef.current;
      v.currentTime = 0;
      setCurrentTime(0);
      setHasEnded(false);
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  // Escape key closes the modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      if (v.ended) {
        v.currentTime = 0;
      }
      v.play();
      setIsPlaying(true);
      setHasEnded(false);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || isScrubbing) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setHasEnded(true);
  };

  const seekToClientX = useCallback((clientX: number) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    setCurrentTime(newTime);
    v.currentTime = newTime;
  }, [duration]);

  const handleScrubStart = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    seekToClientX(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;
    const handleMouseMove = (e: MouseEvent) => seekToClientX(e.clientX);
    const handleMouseUp = () => setIsScrubbing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, seekToClientX]);

  const setVolumeFromClientX = useCallback((clientX: number) => {
    const bar = volumeBarRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    v.volume = ratio;
    v.muted = ratio === 0;
    setVolume(ratio);
    setIsMuted(ratio === 0);
  }, []);

  const handleVolumeStart = (e: React.MouseEvent) => {
    setIsDraggingVolume(true);
    setVolumeFromClientX(e.clientX);
  };

  useEffect(() => {
    if (!isDraggingVolume) return;
    const handleMouseMove = (e: MouseEvent) => setVolumeFromClientX(e.clientX);
    const handleMouseUp = () => setIsDraggingVolume(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingVolume, setVolumeFromClientX]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !v.muted;
    v.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && v.volume === 0) {
      v.volume = 0.6;
      setVolume(0.6);
    }
  };

  const resetHideControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2600);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={styles.player}
        onMouseMove={resetHideControlsTimer}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <div className={styles.topBar}>
          <span className={styles.title}>{title}</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close video"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M1 1L17 17M17 1L1 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.videoWrap} onClick={togglePlay}>
          <video
            ref={videoRef}
            className={styles.video}
            src={src}
            poster={poster}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onClick={(e) => e.stopPropagation()}
            playsInline
          />

          {!isPlaying && (
            <button
              type="button"
              className={styles.centerPlayButton}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              aria-label={hasEnded ? 'Replay video' : 'Play video'}
            >
              {hasEnded ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 12a8 8 0 1 1-2.34-5.66"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path d="M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="22" height="26" viewBox="0 0 22 26" fill="currentColor">
                  <path d="M0 0L22 13L0 26V0Z" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div
          className={`${styles.controls} ${showControls || !isPlaying ? styles.controlsVisible : ''}`}
        >
          <div
            ref={progressBarRef}
            className={styles.progressBar}
            onMouseDown={handleScrubStart}
          >
            <div className={styles.progressTrack} />
            <div className={styles.progressBuffered} style={{ width: `${bufferedPercent}%` }} />
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
            <div className={styles.progressHandle} style={{ left: `${progressPercent}%` }} />
          </div>

          <div className={styles.controlsRow}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="2" y="1" width="4" height="14" rx="1" />
                  <rect x="10" y="1" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
                  <path d="M0 0L16 9L0 18V0Z" />
                </svg>
              )}
            </button>

            <span className={styles.time}>
              {formatTime(currentTime)} <span className={styles.timeDivider}>/</span> {formatTime(duration)}
            </span>

            <div className={styles.volumeGroup}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 6.5H5L9 3V15L5 11.5H2V6.5Z" fill="currentColor" />
                    <path d="M12 6L16 12M16 6L12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 6.5H5L9 3V15L5 11.5H2V6.5Z" fill="currentColor" />
                    <path d="M12.5 6.5C13.3 7.3 13.3 9.7 12.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 6.5H5L9 3V15L5 11.5H2V6.5Z" fill="currentColor" />
                    <path d="M12.5 5.5C14.2 7.5 14.2 9.5 12.5 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M14.5 3.5C17.3 6.5 17.3 10.5 14.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <div
                ref={volumeBarRef}
                className={styles.volumeBar}
                onMouseDown={handleVolumeStart}
              >
                <div className={styles.volumeTrack} />
                <div className={styles.volumeFill} style={{ width: `${volumePercent}%` }} />
                <div className={styles.volumeHandle} style={{ left: `${volumePercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;