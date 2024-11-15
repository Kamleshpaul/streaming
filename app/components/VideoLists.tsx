'use client'

import { Card } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge';
import { IVideo } from '@/server/db'
import React, { useEffect } from 'react'
import { deleteVideoAction, retryProcessVideoAction } from "@/server/actions/video";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VideoLists({
    videos
}: {
    videos: IVideo[]
}) {

    const router = useRouter();
    const isOneVideoIsNotCompleted = videos.filter((video) => video.status === 'processing')



    const handleRetry = (id: number) => {
        const result = retryProcessVideoAction(id);
        toast.promise(result, {
            loading: 'Retrying video...',
            success: (data) => data.message,
            error: (err) => err.toString(),
        });
    }
    const deleteVideo = (id: number) => {
        const result = deleteVideoAction(id);
        toast.promise(result, {
            loading: 'Retrying video...',
            success: (data) => data.message,
            error: (err) => err.toString(),
        });
    }


    useEffect(() => {
        let interval = null;
        if (isOneVideoIsNotCompleted.length != 0) {
            interval = setInterval(() => {
                router.refresh();
            }, 2000)
        }

        return () => {
            if (!interval) return;
            clearInterval(interval);
        }
    }, [isOneVideoIsNotCompleted, router])


    return (
        <div className="max-w-2xl mx-auto my-8 mt-10">
            <h2 className="text-2xl font-bold text-center uppercase mb-5">Videos</h2>
            {videos.map((video) => (
                <Card key={video.id} className="p-5 mt-5">
                    <div className="flex justify-between">
                        <h2 className="text-2xl font-bold">{video.title}</h2>
                        <div className="relative flex gap-3">
                           <a href={`/video/${video.id}`} target="_blank"> <ExternalLink /></a>
                            <Badge className={cn('cursor-pointer',{
                                'bg-green-500': video.status === 'completed',
                                'bg-red-500': video.status === 'error',
                                'bg-yellow-500': video.status === 'processing',
                            })} onClick={() => { handleRetry(video.id) }} variant={'default'}>{video.status}</Badge>
                            <Trash onClick={() => { deleteVideo(video.id) }} className="absolute -top-8 -right-5 cursor-pointer" />
                        </div>
                    </div>

                </Card>
            ))}
        </div>
    )
}
