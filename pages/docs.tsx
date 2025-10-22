import Head from 'next/head';

export default function ApiDocs() {
  return (
    <>
      <Head>
        <title>API Documentation - ClearWallet</title>
        <meta name="description" content="ClearWallet API documentation - OFAC sanctions screening" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ width: '100%', height: '100vh' }}>
        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css"
        />
        <div id="swagger-ui"></div>

        <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js" />
        <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = function() {
                window.ui = SwaggerUIBundle({
                  url: '/openapi.yaml',
                  dom_id: '#swagger-ui',
                  deepLinking: true,
                  presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                  ],
                  plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
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
              };
            `,
          }}
        />
      </div>
    </>
  );
}
