import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from PDF
    const data = await (pdfParse as any).default(buffer);
    const pdfText = data.text;

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    // Generate summary using Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Please provide a comprehensive summary of the following PDF content. Include the main topics, key points, and important details:\n\n${pdfText.slice(0, 100000)}`,
        },
      ],
    });

    const summary = message.content[0].type === 'text' ? message.content[0].text : 'Unable to generate summary';

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process PDF' },
      { status: 500 }
    );
  }
}
