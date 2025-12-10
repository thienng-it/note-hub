#!/usr/bin/env node
/**
 * Generate Postman and Insomnia collections from OpenAPI spec
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const Converter = require('openapi-to-postmanv2');

const OPENAPI_FILE = path.join(__dirname, '../openapi.yaml');
const OUTPUT_DIR = path.join(__dirname, '../collections');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read OpenAPI spec
console.log('📖 Reading OpenAPI specification...');
const openapiContent = fs.readFileSync(OPENAPI_FILE, 'utf8');
const openapiSpec = yaml.load(openapiContent);

// Generate Postman collection
console.log('🔨 Generating Postman collection...');
const postmanFile = path.join(OUTPUT_DIR, 'notehub-api.postman_collection.json');
Converter.convert(
  { type: 'json', data: openapiSpec },
  {
    folderStrategy: 'Tags',
    requestNameSource: 'Fallback',
    indentCharacter: ' ',
  },
  (err, conversionResult) => {
    if (err) {
      console.error('❌ Error generating Postman collection:', err);
      return;
    }

    if (!conversionResult.result) {
      console.error('❌ Conversion failed:', conversionResult.reason);
      return;
    }

    const postmanCollection = conversionResult.output[0].data;

    // Add variables for base URL
    postmanCollection.variable = [
      {
        key: 'baseUrl',
        value: 'http://localhost:5000',
        type: 'string',
      },
    ];

    // Update all request URLs to use variable
    const updateUrls = (items) => {
      for (const item of items) {
        if (item.request) {
          if (typeof item.request.url === 'string') {
            item.request.url = item.request.url.replace(/^https?:\/\/[^/]+/, '{{baseUrl}}');
          } else if (item.request.url && item.request.url.raw) {
            item.request.url.raw = item.request.url.raw.replace(/^https?:\/\/[^/]+/, '{{baseUrl}}');
          }
        }
        if (item.item) {
          updateUrls(item.item);
        }
      }
    };

    if (postmanCollection.item) {
      updateUrls(postmanCollection.item);
    }

    fs.writeFileSync(postmanFile, JSON.stringify(postmanCollection, null, 2));
    console.log(`✅ Postman collection saved to: ${postmanFile}`);
  },
);

// Generate Insomnia collection
console.log('🔨 Generating Insomnia collection...');
const insomniaCollection = {
  _type: 'export',
  __export_format: 4,
  __export_date: new Date().toISOString(),
  __export_source: 'notehub-api.openapi',
  resources: [],
};

// Add workspace
const workspaceId = '_workspace_1';
insomniaCollection.resources.push({
  _id: workspaceId,
  _type: 'workspace',
  name: 'NoteHub API',
  description: openapiSpec.info.description,
  scope: 'collection',
  parentId: null,
});

// Add environment
const envId = '_env_1';
insomniaCollection.resources.push({
  _id: envId,
  _type: 'environment',
  name: 'Base Environment',
  data: {
    baseUrl: 'http://localhost:5000',
    accessToken: '',
  },
  dataPropertyOrder: {
    '&': ['baseUrl', 'accessToken'],
  },
  color: null,
  isPrivate: false,
  metaSortKey: 1,
  parentId: workspaceId,
});

// Add request groups (folders) and requests
let folderIndex = 0;
let requestIndex = 0;

for (const [path, methods] of Object.entries(openapiSpec.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
      const tag = operation.tags?.[0] || 'General';
      const folderId = `_folder_${tag.replace(/\s+/g, '_')}`;

      // Check if folder exists, if not create it
      if (!insomniaCollection.resources.find((r) => r._id === folderId)) {
        insomniaCollection.resources.push({
          _id: folderId,
          _type: 'request_group',
          name: tag,
          description: '',
          environment: {},
          environmentPropertyOrder: null,
          metaSortKey: folderIndex++,
          parentId: workspaceId,
        });
      }

      // Create request
      const requestId = `_req_${requestIndex++}`;
      const request = {
        _id: requestId,
        _type: 'request',
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        description: operation.description || '',
        url: `{{ _.baseUrl }}${path}`,
        method: method.toUpperCase(),
        headers: [],
        authentication: {},
        parameters: [],
        body: {},
        metaSortKey: requestIndex,
        isPrivate: false,
        settingStoreCookies: true,
        settingSendCookies: true,
        settingDisableRenderRequestBody: false,
        settingEncodeUrl: true,
        settingRebuildPath: true,
        settingFollowRedirects: 'global',
        parentId: folderId,
      };

      // Add authentication if required
      if (operation.security && operation.security.length > 0) {
        request.authentication = {
          type: 'bearer',
          token: '{{ _.accessToken }}',
          disabled: false,
        };
      }

      // Add request body if present
      if (operation.requestBody) {
        const content = operation.requestBody.content;
        if (content['application/json']) {
          request.headers.push({
            name: 'Content-Type',
            value: 'application/json',
          });
          request.body = {
            mimeType: 'application/json',
            text: JSON.stringify(content['application/json'].example || {}, null, 2),
          };
        }
      }

      // Add query parameters
      if (operation.parameters) {
        for (const param of operation.parameters) {
          if (param.in === 'query') {
            request.parameters.push({
              name: param.name,
              value: param.example || '',
              description: param.description || '',
              disabled: !param.required,
            });
          } else if (param.in === 'path') {
            // Path parameters are embedded in the URL
            request.url = request.url.replace(`{${param.name}}`, param.example || `:${param.name}`);
          }
        }
      }

      insomniaCollection.resources.push(request);
    }
  }
}

const insomniaFile = path.join(OUTPUT_DIR, 'notehub-api.insomnia.json');
fs.writeFileSync(insomniaFile, JSON.stringify(insomniaCollection, null, 2));
console.log(`✅ Insomnia collection saved to: ${insomniaFile}`);

console.log('\n✨ Collection generation complete!');
console.log('\n📦 Generated files:');
console.log(`  - ${path.relative(process.cwd(), postmanFile)}`);
console.log(`  - ${path.relative(process.cwd(), insomniaFile)}`);
console.log('\n📚 Usage:');
console.log('  - Postman: File → Import → Upload the .postman_collection.json file');
console.log('  - Insomnia: Preferences → Data → Import Data → Select the .insomnia.json file');
