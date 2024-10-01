import { NextRequest, NextResponse } from 'next/server';
import Cartesia from "@cartesia/cartesia-js";
import { leo } from '@/app/data/leo';
import { romy } from '@/app/data/romy';

// Initialize Cartesia client
const cartesia = new Cartesia({
  apiKey: process.env.CARTESIA_API_KEY,
});

const SAMPLE_RATE = 24000; // Change this to match Cartesia's output sample rate

export async function POST(req: NextRequest) {
  try {
    const { text, speaker } = await req.json();

    if (!text || !speaker) {
      throw new Error('Text or speaker not provided');
    }

    const normalizeString = (str: string) => {
      return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const normalizedSpeaker = normalizeString(speaker);
    const voiceId = normalizedSpeaker === 'leo' ? leo.voiceId : romy.voiceId;

    // Generate a unique context ID for this request
    const contextId = `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare the TTS request
    const ttsRequest = {
      context_id: contextId,
      model_id: "sonic-multilingual",
      transcript: text,
      voice: {
        mode: "id",
        id: voiceId,
      },
      output_format: {
        container: "raw",
        encoding: "pcm_s16le",
        sample_rate: SAMPLE_RATE // Use the defined sample rate
      },
      language: "fr",
      add_timestamps: false
    };

    // Return the TTS request and WebSocket URL
    return NextResponse.json({
      success: true,
      websocketUrl: `wss://api.cartesia.ai/tts/websocket?api_key=${process.env.CARTESIA_API_KEY}&cartesia_version=2024-06-10`,
      ttsRequest: ttsRequest,
      sampleRate: SAMPLE_RATE // Send the sample rate to the client
    });

  } catch (error) {
    console.error('Error preparing TTS request:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error occurred' }, { status: 500 });
  }
}