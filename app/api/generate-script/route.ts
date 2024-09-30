import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { romy } from '../../../data/romy';
import { leo } from '../../../data/leo';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  console.log('Received request to generate script');

  try {
    const { topic, duration } = await req.json();

    if (!topic || !duration) {
      console.log('Error: Missing topic or duration');
      return NextResponse.json({ error: 'Missing topic or duration' }, { status: 400 });
    }

    console.log(`Generating script for topic: ${topic}, duration: ${duration} minutes`);

    const wordCount = parseInt(duration) * 125; // Estimating 125 words per minute

    const prompt = `Generate a script for a ${duration}-minute French children's podcast episode for kids between 7 and 10 years old.
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
    - New requirement: Léo should use references to very recent pop culture elements that French kids aged 7-10 can relate to. He should also include jokes or funny comments about these references. Limit these references to a maximum of 3 throughout the episode, and ensure they're not overused.

    Important guidelines for the script:
    1. Start the episode with the hosts greeting each other and briefly explaining what they'll be talking about.
    2. Use simple, everyday French vocabulary that 9-year-olds would use.
    3. Keep sentences short and easy to understand.
    4. Include common French children's expressions and slang (but keep it appropriate).
    5. Reflect the natural excitement, curiosity, and sometimes imperfect grammar of children.
    6. Incorporate playful elements like sound effects (written out) or imaginative scenarios.
    7. Ensure the dialogue flows naturally, with occasional interruptions or tangents typical of children's conversations.
    8. Include some playful, friendly teasing between Romy and Léo throughout the episode.
    9. While educational, make sure the tone remains fun and not too formal or adult-like.
    10. Aim for approximately ${wordCount} words in total.
    11. Have Léo make 1-3 references to recent pop culture elements (e.g., popular kids' movies, TV shows, video games, or toys) and include jokes or funny comments about these references. Ensure these references are spread out and not overused.

    The script should be entertaining and educational, with a natural flow of conversation between ${romy.name} and ${leo.name}.
    Make sure to include their unique characteristics in their dialogue.
    The script should be in French and last about ${duration} minutes when spoken aloud.

    Format the output as a JSON object with the following structure:
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

    Ensure that the JSON is properly formatted and does not contain any unescaped special characters. Your response should only include the JSON object, nothing else.`;

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

    if (!scriptData || !Array.isArray(scriptData.script)) {
      throw new Error('Invalid script format in AI response');
    }

    return NextResponse.json(scriptData);
  } catch (error: unknown) {
    console.error('Error generating script:', error);
    return NextResponse.json({ 
      error: 'Failed to generate script', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}