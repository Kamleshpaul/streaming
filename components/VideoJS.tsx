"use client"

import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import 'videojs-contrib-dash';

interface VideoPlayerProps {
  options: any;
  onReady?: (player: Player) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ options, onReady }) => {
  const videoRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!playerRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      
      // Add crossorigin attribute
      videoElement.setAttribute('crossorigin', 'use-credentials');

      if (videoRef.current) {
        videoRef.current.appendChild(videoElement);
      }

      const player = (playerRef.current = videojs(videoElement, {
        ...options,
        html5: {
          ...options.html5,
          dash: {
            withCredentials: true,
            setXhrWithCredentials: true, 
            overrideNative: true,
            streaming: {
              lowLatencyEnabled: false
            }
          },
          vhs: {
            withCredentials: true
          }
        }
      }, () => {
        videojs.log('player is ready');
              

        if (onReady) {
          onReady(player);
        }
      }));
    } else {
      const player = playerRef.current;
      player.autoplay(options.autoplay);
      player.src(options.sources);
    }
  }, [options, onReady]);

  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
    </div>
  );
};

export default VideoPlayer;