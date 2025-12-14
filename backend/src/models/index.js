/**
 * Sequelize ORM Models
 * Provides a consistent interface for database operations across SQLite and MySQL.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DataTypes, Sequelize } from 'sequelize';
import logger from '../config/logger.js';

let sequelize = null;

/**
 * Initialize Sequelize connection based on environment.
 */
export async function initializeSequelize() {
  const dbPath = process.env.NOTES_DB_PATH;
  const mysqlHost = process.env.MYSQL_HOST;
  const databaseUrl = process.env.DATABASE_URL;

  // Production: Use DATABASE_URL if provided
  if (databaseUrl) {
    sequelize = new Sequelize(databaseUrl, {
      logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    });
    logger.info('🌐 Connected to cloud database via DATABASE_URL');
  }
  // MySQL if MYSQL_HOST is set and no NOTES_DB_PATH
  else if (mysqlHost && !dbPath) {
    const sslDisabled =
      process.env.MYSQL_SSL_DISABLED === 'true' ||
      mysqlHost === 'localhost' ||
      mysqlHost === '127.0.0.1' ||
      mysqlHost === 'mysql' ||
      mysqlHost.startsWith('10.') ||
      mysqlHost.startsWith('172.') ||
      mysqlHost.startsWith('192.168.');

    sequelize = new Sequelize({
      dialect: 'mysql',
      host: mysqlHost,
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      username: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'notehub',
      logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
      dialectOptions: sslDisabled
        ? {}
        : {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
    logger.info(`🐬 Connected to MySQL: ${mysqlHost}`);
  }
  // Default: SQLite
  else {
    const resolvedPath = dbPath
      ? path.isAbsolute(dbPath)
        ? dbPath
        : path.resolve(process.cwd(), dbPath)
      : path.resolve(process.cwd(), 'data', 'notes.db');

    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: resolvedPath,
      logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
    });
    logger.info(`📦 Connected to SQLite: ${resolvedPath}`);
  }

  // Define models
  const models = defineModels();
  ({
    User,
    Tag,
    Note,
    Task,
    ShareNote,
    PasswordResetToken,
    Invitation,
    NoteTag,
    ChatRoom,
    ChatMessage,
    ChatParticipant,
  } = models);

  // Test connection
  await sequelize.authenticate();
  logger.info('✅ Database connection established');

  return sequelize;
}

/**
 * Define all Sequelize models.
 */
function defineModels() {
  // User Model
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 64],
        },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      theme: {
        type: DataTypes.STRING(20),
        defaultValue: 'light',
      },
      hidden_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON array of hidden note IDs',
      },
      preferred_language: {
        type: DataTypes.STRING(10),
        defaultValue: 'en',
        validate: {
          isIn: [['en', 'de', 'vi', 'ja', 'fr', 'es']],
        },
      },
      totp_secret: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'online',
        validate: {
          isIn: [['online', 'offline', 'away', 'busy']],
        },
        comment: 'User status: online, offline, away, busy',
      },
      avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL or path to user avatar image',
      },
    },
    {
      tableName: 'users',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['username'] }, { fields: ['email'] }],
    },
  );

  // Tag Model
  const Tag = sequelize.define(
    'Tag',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      color: {
        type: DataTypes.STRING(7),
        defaultValue: '#3B82F6',
      },
    },
    {
      tableName: 'tags',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['name'] }],
    },
  );

  // Note Model
  const Note = sequelize.define(
    'Note',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        defaultValue: 'Untitled',
      },
      body: {
        type: DataTypes.TEXT,
        defaultValue: '',
      },
      images: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'JSON array of image paths',
      },
      pinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      favorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      owner_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      tableName: 'notes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['owner_id'] }, { fields: ['archived'] }],
    },
  );

  // Task Model
  const Task = sequelize.define(
    'Task',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      images: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'JSON array of image paths',
      },
      completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      due_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      priority: {
        type: DataTypes.STRING(20),
        defaultValue: 'medium',
        validate: {
          isIn: [['low', 'medium', 'high']],
        },
      },
      owner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      tableName: 'tasks',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['owner_id'] }],
    },
  );

  // ShareNote Model (junction table for note sharing)
  const ShareNote = sequelize.define(
    'ShareNote',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      note_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'notes',
          key: 'id',
        },
      },
      shared_by_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      shared_with_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      can_edit: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'share_notes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  // PasswordResetToken Model
  const PasswordResetToken = sequelize.define(
    'PasswordResetToken',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      token: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'password_reset_tokens',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['token'] }],
    },
  );

  // Invitation Model
  const Invitation = sequelize.define(
    'Invitation',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      inviter_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      used_by_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'invitations',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['token'] }],
    },
  );

  // NoteTag junction table for many-to-many relationship
  const NoteTag = sequelize.define(
    'NoteTag',
    {
      note_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'notes',
          key: 'id',
        },
      },
      tag_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'tags',
          key: 'id',
        },
      },
    },
    {
      tableName: 'note_tag',
      timestamps: false,
    },
  );

  // ChatRoom Model
  const ChatRoom = sequelize.define(
    'ChatRoom',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Optional name for group chats, null for direct messages',
      },
      is_group: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'True for group chats, false for direct messages',
      },
      created_by_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      encryption_salt: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'Salt used for encrypting messages in this room',
      },
    },
    {
      tableName: 'chat_rooms',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['created_by_id'] }],
    },
  );

  // ChatMessage Model
  const ChatMessage = sequelize.define(
    'ChatMessage',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'chat_rooms',
          key: 'id',
        },
      },
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Encrypted message content',
      },
      photo_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL or path to uploaded photo attachment',
      },
      is_encrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Flag indicating if message is encrypted',
      },
      encryption_salt: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'Salt used for message encryption (room-specific)',
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'chat_messages',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['room_id'] }, { fields: ['sender_id'] }, { fields: ['created_at'] }],
    },
  );

  // ChatParticipant Model (junction table for room members)
  const ChatParticipant = sequelize.define(
    'ChatParticipant',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'chat_rooms',
          key: 'id',
        },
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      last_read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last message read by this user',
      },
    },
    {
      tableName: 'chat_participants',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['room_id', 'user_id'], unique: true }],
    },
  );

  // Define associations
  User.hasMany(Note, { foreignKey: 'owner_id', as: 'notes' });
  Note.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

  User.hasMany(Task, { foreignKey: 'owner_id', as: 'tasks' });
  Task.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

  Note.belongsToMany(Tag, { through: NoteTag, foreignKey: 'note_id', as: 'tags' });
  Tag.belongsToMany(Note, { through: NoteTag, foreignKey: 'tag_id', as: 'notes' });

  User.hasMany(ShareNote, { foreignKey: 'shared_by_id', as: 'sharedNotes' });
  User.hasMany(ShareNote, { foreignKey: 'shared_with_id', as: 'receivedNotes' });
  Note.hasMany(ShareNote, { foreignKey: 'note_id', as: 'shares' });

  User.hasMany(PasswordResetToken, { foreignKey: 'user_id', as: 'resetTokens' });
  PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  User.hasMany(Invitation, { foreignKey: 'inviter_id', as: 'sentInvitations' });
  Invitation.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' });
  Invitation.belongsTo(User, { foreignKey: 'used_by_id', as: 'usedBy' });

  // Chat associations
  User.hasMany(ChatRoom, { foreignKey: 'created_by_id', as: 'createdChatRooms' });
  ChatRoom.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator' });

  ChatRoom.hasMany(ChatMessage, { foreignKey: 'room_id', as: 'messages' });
  ChatMessage.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'room' });

  User.hasMany(ChatMessage, { foreignKey: 'sender_id', as: 'sentMessages' });
  ChatMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

  ChatRoom.hasMany(ChatParticipant, { foreignKey: 'room_id', as: 'participants' });
  ChatParticipant.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'room' });

  User.hasMany(ChatParticipant, { foreignKey: 'user_id', as: 'chatParticipations' });
  ChatParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // Export models
  return {
    User,
    Tag,
    Note,
    Task,
    ShareNote,
    PasswordResetToken,
    Invitation,
    NoteTag,
    ChatRoom,
    ChatMessage,
    ChatParticipant,
  };
}

// Module-level model exports
let User, Tag, Note, Task, ShareNote, PasswordResetToken, Invitation, NoteTag;
let ChatRoom, ChatMessage, ChatParticipant;

/**
 * Sync database schema.
 */
export async function syncDatabase(options = {}) {
  if (!sequelize) {
    throw new Error('Sequelize not initialized. Call initializeSequelize first.');
  }

  await sequelize.sync(options);
  logger.info('✅ Database schema synchronized');
}

/**
 * Get Sequelize instance.
 */
export function getSequelize() {
  return sequelize;
}

/**
 * Close database connection.
 */
export async function closeDatabase() {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
    logger.info('📴 Database connection closed');
  }
}

// Export models
export { User, Tag, Note, Task, ShareNote, PasswordResetToken, Invitation, NoteTag };
export { ChatRoom, ChatMessage, ChatParticipant };
