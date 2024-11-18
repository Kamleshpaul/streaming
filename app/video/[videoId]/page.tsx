import VideoPlayer from '@/app/components/VideoJS';
import db, { videosTable } from '@/server/db';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

// const VideoPlayer = dynamic(() => import('@/app/components/VideoJS'), { ssr: false });

// export const dynamic = 'force-dynamic'


export default async function Video({ params }: {
    params: {
        videoId: string
    }
}) {
    const { videoId } = await params;

    const video = await db.query.videosTable.findFirst({
        where: eq(videosTable.id, Number(videoId)),
    })
    const { mpd } = JSON.parse(video?.streams || '[]');
    if (!mpd) {
        return notFound();
    }


    return (
        <>
            <VideoPlayer autoPlay mpd={`/${mpd}`} />
        </>
    )
}
