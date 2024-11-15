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

const FORMATS = [
    '240',
    '360',
    '480',
    '720',
    '1080',
  ];
  

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
      // Initialize FFmpeg command
      const ffmpegCommand = ffmpeg(originalPath)
        // .outputOptions([
        //   '-map 0:v', // Map video stream
        //   '-map 0:a?', // Map audio stream if available
        //   '-c:v libx264',
        //   '-c:a aac',
        //   '-preset fast',
        //   '-crf 23',
        //   '-keyint_min 60',
        //   '-g 60', // GOP size
        //   '-sc_threshold 0',
        //   '-profile:v main',
        //   '-use_template 1',
        //   '-use_timeline 1',
        //   '-f dash', // Set format to DASH
        //   '-seg_duration 4', // Duration for each segment (in seconds)
        // ]);
  
      // FORMATS.forEach((format) => {
      //   const resolution = `${format}x?`; 
      //   const outputPath = path.join(dashOutputDir, `video_${format}p.m4s`);
      //   ffmpegCommand.addOutput(outputPath).size(resolution); 
      // });
  
      const mpdManifestPath = path.join(dashOutputDir, `${baseFileName}.mpd`);
      ffmpegCommand.addOutput(mpdManifestPath);
  
      console.log(`FFmpeg command: ${ffmpegCommand._getArguments().join(' ')}`);
  
       await new Promise((resolve, reject) => {
        ffmpegCommand
          .on('end', resolve)
          .on('error', (err) => {
            reject(err);
          })
          .run();
      });

      const dbSavePath = mpdManifestPath.split('public/')[1];
      console.log({dbSavePath});
      
  
      await db.update(videosTable)
        .set({
          status: 'completed',
          streams: JSON.stringify({ mpd: dbSavePath, qualities: FORMATS }),
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