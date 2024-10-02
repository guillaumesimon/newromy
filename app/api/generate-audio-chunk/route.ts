import { NextRequest, NextResponse } from 'next/server';
import { leo } from '@/app/data/leo';
import { romy } from '@/app/data/romy';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const SAMPLE_RATE = 44100;
const TEMP_DIR = path.join(process.cwd(), 'tmp');

async function generateAndUploadAudio(text: string, speaker: string, topicId: string) {
  console.log(`Starting audio generation for: ${speaker}`);
  console.time('Audio processing time');

  const normalizedSpeaker = speaker.toLowerCase().trim();
  let voiceId;

  if (normalizedSpeaker.includes('leo') || normalizedSpeaker.includes('léo')) {
    voiceId = leo.voiceId;
  } else if (normalizedSpeaker.includes('romy')) {
    voiceId = romy.voiceId;
  } else {
    throw new Error(`Unknown speaker: ${speaker}`);
  }

  console.log(`Using voice ID: ${voiceId} for speaker: ${speaker}`);

  await fs.mkdir(TEMP_DIR, { recursive: true });
  const rawAudioFile = path.join(TEMP_DIR, `raw_audio_${Date.now()}.raw`);
  const wavAudioFile = path.join(TEMP_DIR, `audio_${Date.now()}.wav`);

  console.log(`Generating audio for speaker: ${speaker}, text: "${text.substring(0, 30)}..."`);
  
  console.time('Cartesia API call');
  const cartesiaResponse = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Cartesia-Version": "2024-06-10",
      "X-API-Key": process.env.CARTESIA_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transcript: text,
      model_id: "sonic-multilingual",
      voice: { mode: "id", id: voiceId },
      output_format: { container: "raw", encoding: "pcm_f32le", sample_rate: SAMPLE_RATE },
      language: "fr",
    }),
  });
  console.timeEnd('Cartesia API call');

  if (!cartesiaResponse.ok) {
    throw new Error(`Failed to generate audio. Status: ${cartesiaResponse.status}`);
  }

  const audioBuffer = await cartesiaResponse.arrayBuffer();
  await fs.writeFile(rawAudioFile, Buffer.from(audioBuffer));
  console.log(`Raw audio file saved: ${rawAudioFile}`);

  console.log('Converting raw audio to WAV...');
  console.time('FFmpeg conversion');
  await execPromise(`ffmpeg -f f32le -ar ${SAMPLE_RATE} -ac 1 -i ${rawAudioFile} ${wavAudioFile}`);
  console.timeEnd('FFmpeg conversion');

  console.log('Uploading WAV file to Bytescale...');
  console.time('Bytescale upload');
  const fileData = await fs.readFile(wavAudioFile);

  const bytescaleApiKey = process.env.BYTESCALE_API_KEY;
  const bytescaleAccountId = process.env.BYTESCALE_ACCOUNT_ID;

  const bytescaleUrl = `https://api.bytescale.com/v2/accounts/${bytescaleAccountId}/uploads/binary`;
  const bytescaleResponse = await fetch(bytescaleUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bytescaleApiKey}`,
      'Content-Type': 'audio/wav',
    },
    body: fileData,
  });
  console.timeEnd('Bytescale upload');

  if (!bytescaleResponse.ok) {
    const errorText = await bytescaleResponse.text();
    throw new Error(`Failed to upload to Bytescale. Status: ${bytescaleResponse.status}, Error: ${errorText}`);
  }

  const bytescaleData = await bytescaleResponse.json();
  console.log(`File uploaded to Bytescale. URL: ${bytescaleData.fileUrl}`);

  console.timeEnd('Audio processing time');
  return { fileUrl: bytescaleData.fileUrl, localPath: wavAudioFile };
}

async function combineAudioFiles(files: string[], topicId: string) {
  console.log('Combining audio files...');
  const outputFile = path.join(TEMP_DIR, `combined_${topicId}.wav`);
  const fileList = files.map(file => `file '${file}'`).join('\n');
  const listFile = path.join(TEMP_DIR, 'file_list.txt');
  
  await fs.writeFile(listFile, fileList);
  
  await execPromise(`ffmpeg -f concat -safe 0 -i ${listFile} -c copy ${outputFile}`);
  console.log(`Combined audio file created: ${outputFile}`);
  
  return outputFile;
}

async function uploadToBytescale(filePath: string) {
  console.log('Uploading combined file to Bytescale...');
  const fileData = await fs.readFile(filePath);

  const bytescaleApiKey = process.env.BYTESCALE_API_KEY;
  const bytescaleAccountId = process.env.BYTESCALE_ACCOUNT_ID;

  const bytescaleUrl = `https://api.bytescale.com/v2/accounts/${bytescaleAccountId}/uploads/binary`;
  const bytescaleResponse = await fetch(bytescaleUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bytescaleApiKey}`,
      'Content-Type': 'audio/wav',
    },
    body: fileData,
  });

  if (!bytescaleResponse.ok) {
    const errorText = await bytescaleResponse.text();
    throw new Error(`Failed to upload to Bytescale. Status: ${bytescaleResponse.status}, Error: ${errorText}`);
  }

  const bytescaleData = await bytescaleResponse.json();
  console.log(`Combined file uploaded to Bytescale. URL: ${bytescaleData.fileUrl}`);
  return bytescaleData.fileUrl;
}

async function cleanupTempFiles() {
  console.log('Cleaning up temporary files...');
  const files = await fs.readdir(TEMP_DIR);
  for (const file of files) {
    await fs.unlink(path.join(TEMP_DIR, file));
  }
  console.log('Temporary files cleaned up');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, speaker, dialogues, topicId } = body;

    if (text && speaker) {
      // Single audio generation
      console.log(`Received request for single audio generation: ${speaker}`);
      const result = await generateAndUploadAudio(text, speaker, `single_${Date.now()}`);
      return NextResponse.json({ success: true, fileUrl: result.fileUrl });
    } else if (dialogues && topicId) {
      // Combined audio generation
      console.log(`Received request for topicId: ${topicId}, dialogues count: ${dialogues.length}`);
      
      const audioFiles = [];
      for (const dialogue of dialogues) {
        const result = await generateAndUploadAudio(dialogue.text, dialogue.speaker, topicId);
        audioFiles.push(result);
      }

      // Combine audio files using local paths
      const combinedFilePath = await combineAudioFiles(audioFiles.map(file => file.localPath), topicId);
      
      // Upload the combined file to Bytescale
      const combinedFileUrl = await uploadToBytescale(combinedFilePath);
      
      // Clean up temporary files after successful upload
      await cleanupTempFiles();

      // Log the successful completion of the process
      console.log(`Audio generation and upload completed for topicId: ${topicId}. Combined File URL: ${combinedFileUrl}`);

      return NextResponse.json({ success: true, fileUrl: combinedFileUrl, individualUrls: audioFiles.map(file => file.fileUrl) });
    } else {
      throw new Error('Invalid request body');
    }
  } catch (error) {
    console.error('Error generating and uploading audio:', error);
    return NextResponse.json({ 
      error: 'Failed to generate audio', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}