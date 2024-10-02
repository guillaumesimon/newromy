import { NextRequest, NextResponse } from 'next/server';
import { leo } from '@/app/data/leo';
import { romy } from '@/app/data/romy';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const SAMPLE_RATE = 44100;

async function generateAndUploadAudio(text: string, speaker: string) {
  console.log(`Starting audio generation for: ${speaker}`);
  console.time('Audio processing time');

  const normalizedSpeaker = speaker.toLowerCase();
  const voiceId = normalizedSpeaker === 'leo' ? leo.voiceId : romy.voiceId;

  const tempDir = path.join(process.cwd(), 'tmp');
  await fs.mkdir(tempDir, { recursive: true });
  const rawAudioFile = path.join(tempDir, `raw_audio_${Date.now()}.raw`);
  const wavAudioFile = path.join(tempDir, `audio_${Date.now()}.wav`);

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
  console.log(`File uploaded to Bytescale. URL: ${bytescaleData.fileUrl}, Path: ${bytescaleData.filePath}`);

  await fs.unlink(rawAudioFile);
  await fs.unlink(wavAudioFile);
  console.log('Temporary files cleaned up');

  console.timeEnd('Audio processing time');
  return { fileUrl: bytescaleData.fileUrl, filePath: bytescaleData.filePath };
}

export async function POST(req: NextRequest) {
  try {
    const { text, speaker } = await req.json();

    if (!text || !speaker) {
      throw new Error('Text or speaker not provided');
    }

    const result = await generateAndUploadAudio(text, speaker);
    return NextResponse.json({ success: true, fileUrl: result.fileUrl });
  } catch (error) {
    console.error('Error generating and uploading audio:', error);
    return NextResponse.json({ 
      error: 'Failed to generate audio', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}