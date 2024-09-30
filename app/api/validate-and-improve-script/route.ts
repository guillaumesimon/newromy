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

    const prompt = `Please review and improve the following script for a ${duration}-minute children's podcast. The target word count is approximately ${targetWordCount} words, and the current word count is ${currentWordCount}.

    ${romy.name}'s character:
    - Personality: ${romy.personality}
    - Speaking style: ${romy.speakingStyle}
    - Specifics: ${romy.specifics}

    ${leo.name}'s character:
    - Personality: ${leo.personality}
    - Speaking style: ${leo.speakingStyle}
    - Specifics: ${leo.specifics}
    - Léo should use references to very recent pop culture elements that French kids aged 7-10 can relate to.

    Guidelines for improvement:
    1. Ensure the episode starts with the hosts greeting each other and briefly explaining what they'll be talking about.
    2. Adjust the word count to be closer to the target (${targetWordCount} words).
    3. Ensure the language is simple and appropriate for 9-year-old French children.
    4. Maintain the unique speaking styles and personalities of Romy and Léo.
    5. Keep the content very educational but fun and engaging.
    6. Add or remove content as necessary to meet the target duration.
    7. Ensure a natural flow of conversation with occasional interruptions or tangents.
    8. Include some playful, friendly teasing between Romy and Léo throughout the episode.
    9. Make sure the hosts use age-appropriate French expressions and slang.
    10. Incorporate sound effects or imaginative scenarios if they're not already present.
    11. Ensure Léo makes 1-3 references to recent pop culture elements (e.g., popular kids' movies, TV shows, video games, or toys). use only existing references.

    Here's the current script:
    ${JSON.stringify(script, null, 2)}

    Please provide the improved script as a valid JSON object with a 'script' key containing an array of dialogue objects. Your response should only include the JSON object, nothing else. Use this format:

    <example>
    {
      "script": [
        {"speaker": "Romy", "text": "Salut Léo ! Tu sais ce qu'on va faire aujourd'hui ?"},
        {"speaker": "Léo", "text": "Euh... On va parler des dinosaures ?"},
        {"speaker": "Romy", "text": "Presque ! On va parler des fossiles. C'est comme des empreintes de dinosaures, mais en plus cool !"},
        {"speaker": "Léo", "text": "Oh, comme dans ce nouveau jeu vidéo 'Dino Detective' ? J'adore chercher des fossiles dedans !"}
      ]
    }
    </example>

    Ensure that the JSON is properly formatted and does not contain any unescaped special characters.`;

    const message = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt
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