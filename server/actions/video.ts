"use server"

import { db, videosTable } from "../db";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";
import { addToProcessVideoQueue } from "../queues/jobs/videoProcess.job";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";


const UPLOAD_DIR = "public/uploads/videos";

ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');

export const videoUploadAction = async (file: File) => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const originalFileName = file.name;
  const originalPath = path.join(UPLOAD_DIR, originalFileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(originalPath, buffer);

  const result = await db.insert(videosTable).values({
    title: file.name,
    description: file.name,
    path: 'uploads/videos/' + originalFileName,
    status: 'processing',
    streams: '[]',
  });

  if (!result.lastInsertRowid) {
    throw new Error('Failed to insert video into database');
  }
  await addToProcessVideoQueue({
    videoId: Number(result.lastInsertRowid),
  })

  revalidatePath('/');

  return {
    message: 'Video is being processing.'
  };
};


export const retryProcessVideoAction = async (videoId: number) => {

  await addToProcessVideoQueue({
    videoId: videoId,
  })

  await db.update(videosTable).set({
    status: 'processing',
  })

  revalidatePath('/');

  return {
    message: 'Video is being Retried.'
  };

}

export const deleteVideoAction = async (videoId: number) => {
  const video = await db.query.videosTable.findFirst({
    where: eq(videosTable.id, videoId),
  })
  if(!video) {
    throw new Error('Video not found');
  }
  await db.delete(videosTable).where(eq(videosTable.id, videoId));
  revalidatePath('/');

  const originalPath = video.path;
  try {
    await fs.unlink(originalPath);
  } catch (err) {
    console.error(err);
  }

  return {
    message: 'Video deleted successfully.'
  };
}