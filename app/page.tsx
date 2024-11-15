import db from '@/server/db';
import { VideoUploader } from './components/VideoUploader';
import VideoLists from './components/VideoLists';


export default async function Home() {

  const videos = await db.query.videosTable.findMany();

 
  return (
    <div className="bg-gray-200 min-h-screen min-w-screen p-20">
      <h1 className="text-2xl font-bold text-center uppercase">Streaming</h1>

      <div className="max-w-2xl mx-auto my-8">
        <VideoUploader />
      </div>

      <VideoLists videos={videos}/>
    </div>
  );
}
