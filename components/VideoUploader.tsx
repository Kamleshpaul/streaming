'use client';

import { videoUploadAction } from '@/server/actions/video';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';


export function VideoUploader() {
  const [isDragging, setIsDragging] = useState(false);


  const handleUpload = (file: File) => {
    const result = videoUploadAction(file);
    toast.promise(result, {
      loading: 'Uploading video...',
      success: (data) => data.message,
      error: (err) => err.toString(),
    });
  }

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('video/')) {
      handleUpload(file);
    }
  }

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'video/*': []
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <input {...getInputProps()} />
      <p className="text-gray-600">Drag and drop a video here, or click to select</p>
    </div>
  );
} 