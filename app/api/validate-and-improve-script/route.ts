import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { romy } from '../../../data/romy';
import { leo } from '../../../data/leo';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  console.log('Received request to validate and improve script');

  try {
    const { script, duration } = await req.json();

    if (!script || !duration) {
      console.log('Error: Missing script or duration');
      return NextResponse.json({ error: 'Missing script or duration' }, { status: 400 });
    }
    
    const targetWordCount = parseInt(duration) * 125;
    const currentWordCount = script.reduce((count: number, line: { text: string }) => count + line.text.split(' ').length, 0);

    console.log(`Validating and improving script. Target word count: ${targetWordCount}, Current word count: ${currentWordCount}`);

    const systemPrompt = `You are an expert script editor for children's podcasts. Your task is to review and improve a script for a ${duration}-minute French podcast aimed at children aged 7 to 10. The podcast features two hosts, Romy (female) and Léo (male), both 9 years old.

Guidelines for improvement:
1. Ensure the episode starts with the hosts greeting each other and briefly explaining the topic.
2. Adjust the word count to be closer to the target (${targetWordCount} words).
3. Use simple language appropriate for 9-year-old French children.
4. Maintain Romy and Léo's unique speaking styles and personalities.
5. Keep the content educational, fun, and engaging.
6. Ensure a natural conversation flow with occasional interruptions or tangents.
7. Include playful, friendly teasing between Romy and Léo.
8. Use age-appropriate French expressions and slang.
9. Incorporate 1-3 references to recent pop culture elements relevant to French children.
10. Stick to factual information and avoid any invented facts or hallucinations.
11. Conclude with a positive takeaway or interesting question for listeners.

IMPORTANT: Each line of dialogue must be no more than 100 characters long.

Your output should be a valid JSON object with a 'script' key containing an array of dialogue objects. Begin directly with the JSON output, using this format:

{
  "script": [
    {"speaker": "Romy", "text": "Salut Léo ! Tu sais ce qu'on va faire aujourd'hui ?"},
    {"speaker": "Léo", "text": "Euh... On va parler des dinosaures ?"},
    {"speaker": "Romy", "text": "Presque ! On va parler des fossiles. C'est comme des empreintes de dinosaures, mais en plus cool !"}
  ]
}`;

    const userPrompt = `Please review and improve the following script:
${JSON.stringify(script, null, 2)}

Target word count: ${targetWordCount}
Current word count: ${currentWordCount}

Improve the script according to the guidelines provided in the system prompt.`;

    const message = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    console.log('Script validated and improved successfully');

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected content type in response');
    }

    let improvedScriptData;
    try {
      improvedScriptData = JSON.parse(content.text);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response:', content.text);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!improvedScriptData || !Array.isArray(improvedScriptData.script)) {
      throw new Error('Invalid script format in AI response');
    }

    return NextResponse.json(improvedScriptData);
  } catch (error: unknown) {
    console.error('Error validating and improving script:', error);
    return NextResponse.json({ 
      error: 'Failed to validate and improve script', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}