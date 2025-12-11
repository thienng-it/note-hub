/**
 * Elasticsearch configuration and connection management.
 * Provides full-text search capabilities.
 */
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH, SEARCH_MIN_LENGTH } from './constants.js';

// Import metrics recording function - use lazy loading to avoid circular dependency
let recordSearchOperation = null;
async function getMetrics() {
  if (!recordSearchOperation) {
    try {
      const metrics = await import('../middleware/metrics.js');
      recordSearchOperation = metrics.recordSearchOperation;
    } catch (_error) {
      // Metrics not available yet, use noop
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentional noop for lazy loading
      recordSearchOperation = () => {};
    }
  }
  return recordSearchOperation;
}

class ElasticsearchService {
  constructor() {
    this.client = null;
    this.enabled = false;
    this.indexName = 'notehub-notes';
  }

  /**
   * Initialize Elasticsearch connection.
   * Elasticsearch is optional - app works without it.
   */
  async connect() {
    // Check if Elasticsearch is configured
    const esNode = process.env.ELASTICSEARCH_NODE;

    if (!esNode) {
      console.log('⚠️  Elasticsearch not configured - full-text search disabled');
      this.enabled = false;
      return;
    }

    try {
      // Create Elasticsearch client
      const clientConfig = {
        node: esNode,
        requestTimeout: 30000,
        maxRetries: 3,
      };

      // Add authentication if provided
      if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
        clientConfig.auth = {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD,
        };
      }

      // Add API key if provided (takes precedence over basic auth)
      if (process.env.ELASTICSEARCH_API_KEY) {
        clientConfig.auth = {
          apiKey: process.env.ELASTICSEARCH_API_KEY,
        };
      }

      this.client = new Client(clientConfig);

      // Test connection
      await this.client.ping();
      this.enabled = true;

      console.log(`🔍 Connected to Elasticsearch: ${esNode}`);

      // Initialize index
      await this.initializeIndex();
    } catch (error) {
      console.error('⚠️  Elasticsearch connection failed:', error.message);
      console.log('⚠️  Continuing without full-text search - basic search still available');
      this.enabled = false;
      this.client = null;
    }
  }

  /**
   * Initialize notes index with mappings.
   */
  async initializeIndex() {
    if (!this.enabled || !this.client) return;

    try {
      // Check if index exists
      const exists = await this.client.indices.exists({
        index: this.indexName,
      });

      if (!exists) {
        // Create index with mappings
        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 1,
              // Set replicas to 0 for single-node development, 1+ for production
              number_of_replicas:
                process.env.NODE_ENV === 'production'
                  ? ELASTICSEARCH.REPLICAS_PROD
                  : ELASTICSEARCH.REPLICAS_DEV,
              analysis: {
                analyzer: {
                  note_analyzer: {
                    type: 'standard',
                    stopwords: '_english_',
                  },
                },
              },
            },
            mappings: {
              properties: {
                id: { type: 'integer' },
                title: {
                  type: 'text',
                  analyzer: 'note_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                body: {
                  type: 'text',
                  analyzer: 'note_analyzer',
                },
                owner_id: { type: 'integer' },
                tags: { type: 'keyword' },
                pinned: { type: 'boolean' },
                archived: { type: 'boolean' },
                favorite: { type: 'boolean' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' },
              },
            },
          },
        });

        console.log(`✅ Created Elasticsearch index: ${this.indexName}`);
      }
    } catch (error) {
      console.error('Elasticsearch index initialization error:', error.message);
    }
  }

  /**
   * Index a note document.
   */
  async indexNote(note) {
    if (!this.enabled || !this.client) return false;

    try {
      await this.client.index({
        index: this.indexName,
        id: note.id.toString(),
        document: {
          id: note.id,
          title: note.title || '',
          body: note.body || '',
          owner_id: note.owner_id,
          tags: note.tags || [],
          pinned: note.pinned || false,
          archived: note.archived || false,
          favorite: note.favorite || false,
          created_at: note.created_at,
          updated_at: note.updated_at,
        },
        refresh: ELASTICSEARCH.REFRESH_STRATEGY,
      });

      return true;
    } catch (error) {
      console.error(`Elasticsearch index error for note ${note.id}:`, error.message);
      return false;
    }
  }

  /**
   * Delete a note document.
   */
  async deleteNote(noteId) {
    if (!this.enabled || !this.client) return false;

    try {
      await this.client.delete({
        index: this.indexName,
        id: noteId.toString(),
      });

      return true;
    } catch (error) {
      // Ignore not found errors
      if (error.meta?.statusCode !== 404) {
        console.error(`Elasticsearch delete error for note ${noteId}:`, error.message);
      }
      return false;
    }
  }

  /**
   * Search notes with full-text search.
   */
  async searchNotes(userId, query, options = {}) {
    if (!this.enabled || !this.client) return null;

    const startTime = Date.now();
    let success = true;

    try {
      const { archived = false, favorite = null, tags = null, limit = 20, offset = 0 } = options;

      // Build search query
      const must = [{ term: { owner_id: userId } }, { term: { archived } }];

      if (query && query.length >= SEARCH_MIN_LENGTH) {
        // Sanitize query to prevent Elasticsearch query injection
        // Escape special characters used in Elasticsearch query syntax
        const sanitizedQuery = query.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&');

        must.push({
          multi_match: {
            query: sanitizedQuery,
            fields: ['title^2', 'body'], // Title is 2x more important
            type: 'best_fields',
            operator: 'or',
            fuzziness: 'AUTO',
          },
        });
      }

      if (favorite !== null) {
        must.push({ term: { favorite } });
      }

      if (tags && tags.length > 0) {
        must.push({ terms: { tags } });
      }

      const response = await this.client.search({
        index: this.indexName,
        body: {
          query: {
            bool: { must },
          },
          sort: [
            { pinned: { order: 'desc' } },
            { _score: { order: 'desc' } },
            { updated_at: { order: 'desc' } },
          ],
          from: offset,
          size: limit,
          _source: [
            'id',
            'title',
            'owner_id',
            'tags',
            'pinned',
            'archived',
            'favorite',
            'created_at',
            'updated_at',
          ],
        },
      });

      return {
        total: response.hits.total.value,
        notes: response.hits.hits.map((hit) => ({
          ...hit._source,
          score: hit._score,
        })),
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error.message);
      success = false;
      return null;
    } finally {
      // Record metrics
      const duration = Date.now() - startTime;
      const recordMetrics = getMetrics();
      recordMetrics('elasticsearch', duration, success);
    }
  }

  /**
   * Bulk index multiple notes.
   */
  async bulkIndexNotes(notes) {
    if (!this.enabled || !this.client || notes.length === 0) return false;

    try {
      const body = notes.flatMap((note) => [
        { index: { _index: this.indexName, _id: note.id.toString() } },
        {
          id: note.id,
          title: note.title || '',
          body: note.body || '',
          owner_id: note.owner_id,
          tags: note.tags || [],
          pinned: note.pinned || false,
          archived: note.archived || false,
          favorite: note.favorite || false,
          created_at: note.created_at,
          updated_at: note.updated_at,
        },
      ]);

      await this.client.bulk({
        body,
        refresh: ELASTICSEARCH.BULK_REFRESH_STRATEGY,
      });

      return true;
    } catch (error) {
      console.error('Elasticsearch bulk index error:', error.message);
      return false;
    }
  }

  /**
   * Check if Elasticsearch is enabled.
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Close Elasticsearch connection.
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.enabled = false;
    }
  }
}

// Singleton instance
const elasticsearch = new ElasticsearchService();

export default elasticsearch;
