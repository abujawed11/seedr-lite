import { useState, useRef, useEffect } from "react";

export default function MediaPlayer({
  src,
  title = "Video Player",
  onClose,
  poster = null,
  type = "video/mp4"
}) {
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Auto-hide controls timer
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set src only once to prevent repeated requests
    if (video.src !== src) {
      video.src = src;
    }

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => {
      setIsBuffering(false);
      setIsLoadingInitial(false);
      setHasError(false);
      // Ensure audio is not muted when media can play
      if (video.muted && volume > 0) {
        video.muted = false;
        video.volume = volume;
      }
    };

    const handleStalled = () => {
      console.log('Video stalled - network or decoding issue');
      setIsBuffering(true);
    };

    const handleSuspend = () => {
      console.log('Video loading suspended');
      // Don't treat suspend as an error, it's normal behavior
    };

    const handleAbort = () => {
      console.log('Video loading aborted');
      // This can happen during normal playback, don't treat as error
    };
    const handleLoadStart = () => {
      setIsBuffering(true);
      setIsLoadingInitial(true);
    };
    const handleError = (e) => {
      console.error('Video error:', e);
      setIsBuffering(false);
      setIsLoadingInitial(false);
      setHasError(true);

      // Stop any potential error loops by pausing
      if (video && !video.paused) {
        video.pause();
      }

      // Determine error message based on error type
      if (e.target.error) {
        switch (e.target.error.code) {
          case e.target.error.MEDIA_ERR_NETWORK:
            setErrorMessage('Network error occurred while loading the video.');
            break;
          case e.target.error.MEDIA_ERR_DECODE:
            setErrorMessage('Error occurred while decoding the video.');
            break;
          case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            setErrorMessage('Video format is not supported.');
            break;
          case e.target.error.MEDIA_ERR_ABORTED:
            setErrorMessage('Video loading was aborted.');
            break;
          default:
            setErrorMessage('An error occurred while loading the video.');
        }
      } else {
        setErrorMessage('Failed to load video. This may be due to CORS restrictions or network issues.');
      }
    };
    const handleLoadedMetadata = () => {
      setIsLoadingInitial(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('error', handleError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('suspend', handleSuspend);
    video.addEventListener('abort', handleAbort);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('suspend', handleSuspend);
      video.removeEventListener('abort', handleAbort);
    };
  }, [src]);

  // Auto-hide controls
  useEffect(() => {
    const startHideTimer = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    if (showControls && isPlaying) {
      startHideTimer();
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (video.paused) {
      try {
        // Ensure video is not muted before playing
        if (video.muted && volume > 0) {
          video.muted = false;
          video.volume = volume;
        }
        await video.play();
      } catch (error) {
        console.error('Error playing video:', error);
        // Handle autoplay restrictions
        if (error.name === 'NotAllowedError') {
          // User interaction required - the play button click should handle this
        }
      }
    } else {
      video.pause();
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const progressBar = progressRef.current;
    const clickX = e.nativeEvent.offsetX;
    const width = progressBar.offsetWidth;
    const newTime = (clickX / width) * duration;
    video.currentTime = newTime;
  };

  const handleVolumeChange = (newVolume) => {
    const video = videoRef.current;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (isMuted) {
      video.volume = volume > 0 ? volume : 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = videoRef.current.parentElement;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  };

  const changePlaybackRate = (rate) => {
    const video = videoRef.current;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const skipTime = (seconds) => {
    const video = videoRef.current;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const handleMouseMove = () => {
    setShowControls(true);
    // Clear existing timeout and start a new one
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 1000);
    }
  };

  // Handle mouse activity on control elements to prevent hiding
  const handleControlsMouseEnter = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  const handleControlsMouseLeave = () => {
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skipTime(-10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        skipTime(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        handleVolumeChange(Math.min(1, volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 0.1));
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'Escape':
        if (onClose) onClose();
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 backdrop-blur-sm"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-60 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Media Player Container */}
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] mx-auto group">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={poster}
          preload="metadata"
          crossOrigin="anonymous"
          playsInline
          muted={false}
          controls={false}
        />

        {/* Loading Spinner */}
        {(isBuffering || isLoadingInitial) && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
              <p className="text-white text-lg">
                {isLoadingInitial ? 'Loading video...' : 'Buffering...'}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4 text-center max-w-md px-6">
              <div className="text-red-400 text-6xl">⚠️</div>
              <h3 className="text-white text-xl font-semibold">Playback Error</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{errorMessage}</p>
              <div className="flex space-x-4 mt-4">
                <button
                  onClick={() => {
                    setHasError(false);
                    setErrorMessage('');
                    setIsLoadingInitial(true);
                    const video = videoRef.current;
                    if (video) {
                      // Reset the src to trigger a fresh load
                      video.src = '';
                      setTimeout(() => {
                        video.src = src;
                        video.load();
                      }, 100);
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  🔄 Retry
                </button>
                <button
                  onClick={() => window.open(src, '_blank')}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                >
                  🔗 Open Direct Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          onMouseEnter={handleControlsMouseEnter}
          onMouseLeave={handleControlsMouseLeave}
        >

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4">
            <h2 className="text-white text-xl font-semibold truncate">{title}</h2>
          </div>

          {/* Center Play/Pause Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlayPause}
              className="p-4 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all duration-200 hover:scale-110"
            >
              {isPlaying ? (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">

            {/* Progress Bar */}
            <div className="relative group/progress">
              <div
                ref={progressRef}
                className="w-full h-2 bg-white/20 rounded-full cursor-pointer hover:h-3 transition-all duration-200"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full relative transition-all duration-200"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity duration-200"></div>
                </div>
              </div>
            </div>

            {/* Control Buttons Row */}
            <div
              className="flex items-center justify-between text-white"
              onMouseEnter={handleControlsMouseEnter}
              onMouseLeave={handleControlsMouseLeave}
            >

              {/* Left Controls */}
              <div className="flex items-center space-x-4">

                {/* Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Skip Backward */}
                <button
                  onClick={() => skipTime(-10)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Rewind 10s"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                    <text x="12" y="15" fontSize="8" textAnchor="middle" fill="white">10</text>
                  </svg>
                </button>

                {/* Skip Forward */}
                <button
                  onClick={() => skipTime(10)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Forward 10s"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                    <text x="12" y="15" fontSize="8" textAnchor="middle" fill="white">10</text>
                  </svg>
                </button>

                {/* Volume Controls */}
                <div className="flex items-center space-x-2 relative">
                  <button
                    onClick={toggleMute}
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                      </svg>
                    )}
                  </button>

                  {/* Volume Slider */}
                  {showVolumeSlider && (
                    <div
                      className="absolute left-full ml-2 bottom-0"
                      onMouseEnter={() => setShowVolumeSlider(true)}
                      onMouseLeave={() => setShowVolumeSlider(false)}
                    >
                      <div className="bg-black/80 p-3 rounded-lg">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-20 slider"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Display */}
                <div className="text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-4">

                {/* Playback Speed */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors text-sm font-medium"
                  >
                    {playbackRate}x
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-full mb-2 right-0 bg-black/90 rounded-lg p-2 min-w-[80px]">
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`block w-full text-left px-3 py-1 rounded hover:bg-white/20 transition-colors ${
                            playbackRate === rate ? 'bg-yellow-500/30' : ''
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}