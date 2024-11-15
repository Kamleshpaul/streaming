// @ts-nocheck


"use client"

import 'shaka-player-react/dist/controls.css';
import dynamic from 'next/dynamic';


const ShakaPlayer = dynamic(() => import('shaka-player-react'), { ssr: false });

const VideoPlayer = ({ mpd }: { mpd: string }) => {
 
  return <ShakaPlayer autoPlay src={mpd} />
};

export default VideoPlayer; 