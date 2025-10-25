import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: NextRequest) {
  try {
    // Read the OpenAPI YAML file
    const filePath = path.join(process.cwd(), 'public', 'openapi.yaml');
    const yamlContent = fs.readFileSync(filePath, 'utf8');

    return new NextResponse(yamlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/yaml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load OpenAPI specification' },
      { status: 500 }
    );
  }
}
