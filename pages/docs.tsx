import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';

export default function ApiDocs() {
  useEffect(() => {
    // Initialize Swagger UI after scripts load
    const initSwagger = () => {
      if (typeof window !== 'undefined' && (window as any).SwaggerUIBundle) {
        (window as any).ui = (window as any).SwaggerUIBundle({
          url: '/openapi.yaml',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            (window as any).SwaggerUIBundle.presets.apis,
            (window as any).SwaggerUIStandalonePreset
          ],
          plugins: [
            (window as any).SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          docExpansion: "list",
          filter: true,
          tryItOutEnabled: true,
          supportedSubmitMethods: ['get', 'post', 'delete'],
          validatorUrl: null
        });
      }
    };

    // Wait a bit for scripts to load
    const timer = setTimeout(initSwagger, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>API Documentation - ClearWallet</title>
        <meta name="description" content="ClearWallet API documentation - OFAC sanctions screening" />
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css"
        />
      </Head>

      <Script
        src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"
        strategy="beforeInteractive"
      />

      <div id="swagger-ui" style={{ width: '100%', minHeight: '100vh' }} />
    </>
  );
}
