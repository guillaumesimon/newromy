import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { romy } from '../../../data/romy';
import { leo } from '../../../data/leo';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  console.log('Received request to generate script');

  try {
    const { topic, duration } = await request.json();

    if (!topic || !duration) {
      console.log('Error: Missing topic or duration');
      return NextResponse.json({ error: 'Missing topic or duration' }, { status: 400 });
    }

    console.log(`Generating script for topic: ${topic}, duration: ${duration}`);

    const wordCount = duration === 'short' ? 250 : duration === 'medium' ? 625 : 1500; // Estimating words based on duration

    const systemPrompt = `You are a world-class podcast producer tasked with transforming the provided input text into an engaging and informative podcast script for children aged 7 to 10 who speak French. The podcast features a conversation between two 10-year-old children, Romy (female) and Léo (male). Your goal is to extract the most interesting and insightful content to create a compelling and educational discussion that blends entertainment and learning.

    // ... (rest of the system prompt remains the same as in your example)

    Remember: Always reply in valid JSON format, without code blocks. Begin directly with the JSON output.`;

    const userPrompt = `Generate a script for a ${duration} French children's podcast episode for kids between 7 and 10 years old.
    The hosts are ${romy.name} and ${leo.name}, both ${romy.age} years old.
    The topic of this episode is: ${topic}

    ${romy.name}'s character:
    - Personality: ${romy.personality}
    - Speaking style: ${romy.speakingStyle}
    - Specifics: ${romy.specifics}

    ${leo.name}'s character:
    - Personality: ${leo.personality}
    - Speaking style: ${leo.speakingStyle}
    - Specifics: ${leo.specifics}

    Aim for approximately ${wordCount} words in total.

    Format the output as a JSON object with the following structure:
    {
      "script": [
        {"id": 1, "speaker": "Romy", "text": "Salut Léo ! Tu sais ce qu'on va faire aujourd'hui ?"},
        {"id": 2, "speaker": "Léo", "text": "Euh... On va parler des dinosaures ?"},
        {"id": 3, "speaker": "Romy", "text": "Presque ! On va parler des fossiles. C'est comme des empreintes de dinosaures, mais en plus cool !"},
        {"id": 4, "speaker": "Léo", "text": "Oh, comme dans ce nouveau jeu vidéo 'Dino Detective' ? J'adore chercher des fossiles dedans !"}
      ]
    }

    Ensure that the JSON is properly formatted, includes an 'id' for each line, and does not contain any unescaped special characters. Your response should only include the JSON object, nothing else.`;

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

    console.log('Script generated successfully');

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected content type in response');
    }

    let scriptData;
    try {
      scriptData = JSON.parse(content.text);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response:', content.text);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Check if the scriptData has the expected structure
    if (!scriptData || !Array.isArray(scriptData.script) || !scriptData.script.every((line: any) => 'id' in line && 'speaker' in line && 'text' in line)) {
      console.error('Invalid script format:', JSON.stringify(scriptData, null, 2));
      throw new Error('Invalid script format in AI response');
    }

    console.log('Script validation successful');
    return NextResponse.json(scriptData);
  } catch (error: unknown) {
    console.error('Error generating script:', error);
    return NextResponse.json({ 
      error: 'Failed to generate script', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}