// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { S3, PutObjectCommand, ObjectCannedACL } from "@aws-sdk/client-s3";
import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

const public_read: ObjectCannedACL = "public-read";
const bucket = process.env.BUCKET_NAME;
const folder = process.env.BUCKET_FOLDER;
const endpoint = process.env.BUCKET_ADDRESS;
const s3Client = new S3({
  forcePathStyle: false,
  endpoint: process.env.BUCKET_ADDRESS,
  region: process.env.BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.BUCKET_KEY!,
    secretAccessKey: process.env.BUCKET_SECRET!,
  },
});
const basePublisherUrl = "http://127.0.0.1:31415";
const baseAggregatorUrl = "http://127.0.0.1:31416";

export async function uploadImage(image: string, name: string): Promise<string> {
  const buf = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  const params = {
    Bucket: bucket,
    Key: `${folder}/${name}`,
    Body: buf,
    ACL: public_read,
    ContentEncoding: 'base64',
    ContentType: "image/png",
  };
  await s3Client.send(new PutObjectCommand(params));
  return `${endpoint}/${bucket}/${folder}/${name}`;
}

export async function uploadCiphertext(cipher: string, imageName: string): Promise<string> {
  const path = `${folder}/${imageName}_ciphertext`;
    const params = {
        Bucket: bucket,
        Key: path,
        Body: cipher,
        ACL: public_read,
        ContentType: "text/plain",
    };
    const result = await s3Client.send(new PutObjectCommand(params));
    return `${endpoint}/${bucket}/${path}`;
}


// Walrus storage mechanism
export async function uploadCipherTextWal(cipher: string, imageName: string): Promise<string> {
  // console.log("UPLOADING to WALRUS!!!");
  // const blob = new Blob([cipher], {type: 'text/plain'});
  // const file = new File([blob], `${imageName}.txt`, { type: 'text/plain' });
  // const formData = new FormData();
  // formData.append('file', file);

  // fs.writeFile("test.txt", cipher, (err) => {
  //   if (err) {
  //       console.error('Error writing file:', err);
  //   } else {
  //       console.log('File has been saved successfully.');
  //   }
  // });


  const url = `${basePublisherUrl}/v1/store?epochs=1`;
  try{
    // const res = await axios.put(url, {cipher, imageName});
    console.log("Length: ", cipher.length);
    const res = await axios.put(url, {cipher});
    console.log('File uploaded successfully:', res.data);
    const blobID = res.data.newlyCreated.blobObject.blobId;
    console.log(res.status);
    return `${baseAggregatorUrl}/v1/${blobID}`;
  }catch (e){
    console.log("ERROR: ", e);
    return e
  }
}

export async function uploadImageWL(image: string, name: string): Promise<string> {
  const buf = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  const response = await fetch(`${basePublisherUrl}/v1/store`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': buf.length.toString(),
      'Content-Disposition': `attachment; filename="${name}"`,
    },
    body: buf,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload image: ${response.statusText}`);
  }

  const responseBody = await response.json();
  const blobID = responseBody.newlyCreated.blobObject.blobId;
  console.log(responseBody);
  return `${baseAggregatorUrl}/v1/${blobID}`;
}

export async function deleteItem(path: string): Promise<void> {
    const params = {
        Bucket: bucket,
        Key: path,
    };
    await s3Client.deleteObject(params);
}

export async function getItem(path: string): Promise<string> {
    const params = {
        Bucket: bucket,
        Key: path,
    };
    const result = await s3Client.getObject(params);
    return result.Body?.toString()!;
}