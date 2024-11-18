import { redisConnection } from "@/server/redis";
import { Queue, Worker } from "bullmq";
import { defaultQueueConfig } from "../config";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import db, { videosTable } from "@/server/db";
import { eq } from "drizzle-orm";
import fs from "fs/promises";

const STREAMS_DIR = "public/uploads/streams";

ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');

interface FormatConfig {
  resolution: string;
  width: number;
  height: number;
  bitrate: string;
  profile: 'high' | 'main' | 'baseline';
  audioRate: number;
}

const FORMAT_CONFIGS: Record<string, FormatConfig> = {
  '2160': {
    resolution: '2160',
    width: 3840,
    height: 2160,
    bitrate: '10000k',
    profile: 'high',
    audioRate: 48000
  },
  '1080': {
    resolution: '1080',
    width: 1920,
    height: 1080,
    bitrate: '5000k',
    profile: 'high',
    audioRate: 48000
  },
  '720': {
    resolution: '720',
    width: 1280,
    height: 720,
    bitrate: '2500k',
    profile: 'main',
    audioRate: 48000
  },
  '480': {
    resolution: '480',
    width: 854,
    height: 480,
    bitrate: '1200k',
    profile: 'main',
    audioRate: 48000
  }
};

const FORMATS = Object.keys(FORMAT_CONFIGS);

const queueName = 'processVideo';
interface QueueInterface {
  videoId: number;
}

const processVideoQueue = new Queue(queueName, {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultQueueConfig,
    delay: 500,
  }
});

const processVideoStreams = async (videoId: number) => {

  const video = await db.query.videosTable.findFirst({
    where: eq(videosTable.id, videoId),
  });

  if (!video) {
    throw new Error('Video not found');
  }
  const originalPath = `public/${video.path}`;

  const baseFileName = video.title.split('.')[0];
  const dashOutputDir = path.join(STREAMS_DIR, baseFileName);

  await fs.mkdir(dashOutputDir, { recursive: true });
  await fs.mkdir(STREAMS_DIR, { recursive: true });

  try {
    // First probe the video to check for streams
    const probePromise = new Promise((resolve, reject) => {
      ffmpeg.ffprobe(originalPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    const metadata = await probePromise as any;
  
    const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
    const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

    if (!videoStream) {
      throw new Error('No video stream found in the file');
    }

    if (!audioStream) {
      throw new Error('No audio stream found in the file');
    }

    const ffmpegCommand = ffmpeg(originalPath);
    const mpdPath = path.join(dashOutputDir, `manifest.mpd`);

    // Start building the command
    ffmpegCommand      
      // Add codecs
      .videoCodec('libx264')
      .audioCodec('aac');

    // Add stream mappings dynamically using the correct stream indexes
    FORMATS.forEach(() => {
      ffmpegCommand
        .addOption('-map', `0:${videoStream.index}`) 
        .addOption('-map', `0:${audioStream.index}`); 
    });

    // Add video quality settings dynamically
    FORMATS.forEach((format, index) => {
      const config = FORMAT_CONFIGS[format];
      ffmpegCommand
        .addOption(`-b:v:${index}`, config.bitrate)
        .addOption(`-s:v:${index}`, `${config.width}x${config.height}`)
        .addOption(`-profile:v:${index}`, config.profile)
        .addOption(`-ar:a:${index}`, config.audioRate.toString());
    });

    // Add encoding settings
    ffmpegCommand
      .addOption('-bf', '1')
      .addOption('-keyint_min', '120')
      .addOption('-g', '120')
      .addOption('-sc_threshold', '0')
      .addOption('-b_strategy', '0')

      // DASH settings
      .addOption('-use_timeline', '1')
      .addOption('-use_template', '1')
      .addOption('-window_size', '5')
      .addOption('-adaptation_sets', 'id=0,streams=v id=1,streams=a')
      .format('dash')

      // Output
      .output(mpdPath);

    await new Promise((resolve, reject) => {
      ffmpegCommand
        .on('start', (commandLine) => {
          console.log('FFmpeg started:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('Processing: ' + (progress?.percent || 0) + '% done');
        })
        .on('end', () => {
          console.log('FFmpeg processing finished');
          resolve(null);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });

    const dbSavePath = mpdPath.split('public/')[1];
    
    await db.update(videosTable)
      .set({
        status: 'completed',
        streams: JSON.stringify({ 
          mpd: dbSavePath,
          qualities: FORMATS 
        }),
      })
      .where(eq(videosTable.id, videoId));

  } catch (error) {
    console.error('Error processing video:', error);

    await db.update(videosTable)
      .set({ status: 'error' })
      .where(eq(videosTable.id, videoId));
  }
};

new Worker(queueName,
  async (job) => {

    /**
     * Handle the job
     * 
     */
    const data: QueueInterface = job.data;
    await processVideoStreams(data.videoId);

  }, {
  connection: redisConnection
});

export const addToProcessVideoQueue = (data: QueueInterface) => {
  return processVideoQueue.add(queueName, data);
};