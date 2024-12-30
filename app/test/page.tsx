"use client";

import React from 'react'
import { setCookiesAction } from '@/server/actions/setCookies'
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('../components/VideoJS'), { ssr: false });

function Test() {

	const playerOptions = {
		autoplay: true,
		controls: true,
		responsive: true,
		fluid: true,
		sources: [
		  {
			src: "https://d1fps5qy14k02z.cloudfront.net/processed/SampleVideo_1280x720_2mb/manifest.mpd",
			type: "application/dash+xml",
			withCredentials: true
		  },
		],
	  };

	return (
		<div className="bg-gray-200 min-h-screen min-w-screen p-20">
			<h1 className="text-2xl font-bold text-center uppercase">Streaming</h1>

			<VideoPlayer options={playerOptions} onReady={(player) => console.log("Player is ready!", player)} />
		
			<br />
			<br />
			<button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded' onClick={async () => {
				await setCookiesAction();
				console.log('cookies set');
			}}>Set cookies</button>
		</div>
	)
}

export default Test