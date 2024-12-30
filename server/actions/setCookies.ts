"use server";


import { cookies } from "next/headers";
import { getSignedCookies } from "@aws-sdk/cloudfront-signer";


const DISTRIBUTION_DOMAIN = "https://d1fps5qy14k02z.cloudfront.net"
const S3_OBJECT_KEY = "processed/SampleVideo_1280x720_2mb"
const KEY_PAIR_ID = process.env.KEY_PAIR_ID!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

export async function setCookiesAction() {


	const cookieOptions = {
		// maxAge is in seconds, this sets it to 1 hour
		maxAge: 60 * 60,
		// This cookie should be accessible by client-side JavaScript
		httpOnly: false,
		// Use secure in production
		secure: process.env.NODE_ENV === 'production',
		// For local development, we need to use 'lax'
		sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
		// Don't set domain in development - let it default to localhost
		// domain: process.env.NODE_ENV === 'production' ? 'your-production-domain.com' : undefined,
		// Make sure cookie is available for the video path
		path: '/',
	  }
	const signedCookies: any = getSignedCookies({
		url: `${DISTRIBUTION_DOMAIN}/${S3_OBJECT_KEY}/*`, // URL to the manifest file
		keyPairId: KEY_PAIR_ID,
		privateKey: PRIVATE_KEY,
		dateLessThan: new Date(Date.now() + 3600 * 1000).toISOString(), // Expires in 1 hour
	});

	const cookieStore = await cookies()

	Object.keys(signedCookies).forEach((key: string) => {
		cookieStore.set(key, signedCookies[key], cookieOptions);

		console.log({ key, val: signedCookies[key] });

	});

	return {
		status: 200,
		body: JSON.stringify({ message: 'cookies set' }),
	};
}