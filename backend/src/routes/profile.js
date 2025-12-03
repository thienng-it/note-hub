/**
 * Profile and User Routes.
 */
const express = require('express');
const router = express.Router();
const { jwtRequired } = require('../middleware/auth');
const { User, Note, Tag, ShareNote, Invitation, NoteTag, Op } = require('../models');
const { getSequelize } = require('../models');
const crypto = require('crypto');

/**
 * GET /api/profile - Get current user's profile
 */
router.get('/', jwtRequired, async (req, res) => {
  try {
    // Get user stats
    const totalNotes = await Note.count({ where: { owner_id: req.userId } });
    const favoriteNotes = await Note.count({ where: { owner_id: req.userId, favorite: true } });
    const archivedNotes = await Note.count({ where: { owner_id: req.userId, archived: true } });
    const sharedNotesCount = await ShareNote.count({ where: { shared_by_id: req.userId } });
    const notesSharedWithMe = await ShareNote.count({ where: { shared_with_id: req.userId } });
    
    // Count distinct tags for user's notes
    const sequelize = getSequelize();
    const [tagCountResult] = await sequelize.query(
      `SELECT COUNT(DISTINCT t.id) as count 
       FROM tags t 
       INNER JOIN note_tag nt ON t.id = nt.tag_id 
       INNER JOIN notes n ON nt.note_id = n.id 
       WHERE n.owner_id = :userId`,
      { replacements: { userId: req.userId } }
    );
    const totalTags = tagCountResult[0]?.count || 0;

    // Get recent notes
    const recentNotes = await Note.findAll({
      where: { owner_id: req.userId },
      attributes: ['id', 'title', 'updated_at'],
      order: [['updated_at', 'DESC']],
      limit: 5,
      raw: true
    });

    // Get notes shared with user - using raw query since associations are complex
    const [sharedWithMeRaw] = await sequelize.query(
      `SELECT n.id, n.title, u.username as shared_by, sn.created_at
       FROM notes n
       JOIN share_notes sn ON n.id = sn.note_id
       JOIN users u ON sn.shared_by_id = u.id
       WHERE sn.shared_with_id = :userId
       ORDER BY sn.created_at DESC
       LIMIT 5`,
      { replacements: { userId: req.userId } }
    );
    const sharedWithMe = sharedWithMeRaw;

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        bio: req.user.bio,
        theme: req.user.theme,
        has_2fa: !!req.user.totp_secret,
        created_at: req.user.created_at,
        last_login: req.user.last_login
      },
      stats: {
        total_notes: totalNotes || 0,
        favorite_notes: favoriteNotes || 0,
        archived_notes: archivedNotes || 0,
        shared_notes: sharedNotesCount || 0,
        notes_shared_with_me: notesSharedWithMe || 0,
        total_tags: totalTags || 0
      },
      recent_notes: recentNotes,
      shared_with_me: sharedWithMe
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/profile - Update user profile
 */
router.put('/', jwtRequired, async (req, res) => {
  try {
    const { username, email, bio, theme } = req.body;

    // Check if new username already exists
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({
        where: {
          username,
          id: { [Op.ne]: req.userId }
        }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    const updates = {};

    if (username !== undefined) {
      updates.username = username.trim();
    }
    if (email !== undefined) {
      updates.email = email || null;
    }
    if (bio !== undefined) {
      updates.bio = bio || null;
    }
    if (theme !== undefined && ['light', 'dark'].includes(theme)) {
      updates.theme = theme;
    }

    if (Object.keys(updates).length > 0) {
      await User.update(updates, { where: { id: req.userId } });
    }

    const updatedUser = await User.findOne({
      where: { id: req.userId },
      attributes: ['id', 'username', 'email', 'bio', 'theme', 'totp_secret', 'created_at']
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        theme: updatedUser.theme,
        has_2fa: !!updatedUser.totp_secret,
        created_at: updatedUser.created_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/profile/toggle-theme - Toggle theme
 */
router.post('/toggle-theme', jwtRequired, async (req, res) => {
  try {
    const newTheme = req.user.theme === 'light' ? 'dark' : 'light';
    
    await User.update(
      { theme: newTheme },
      { where: { id: req.userId } }
    );

    res.json({ theme: newTheme });
  } catch (error) {
    console.error('Toggle theme error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/invitations - Get user's invitations
 */
router.get('/invitations', jwtRequired, async (req, res) => {
  try {
    const invitations = await Invitation.findAll({
      where: { inviter_id: req.userId },
      include: [{
        model: User,
        as: 'usedBy',
        attributes: ['username'],
        required: false
      }],
      order: [['created_at', 'DESC']]
    });

    // Format the response to match the expected structure
    const formattedInvitations = invitations.map(inv => ({
      ...inv.get({ plain: true }),
      used_by_username: inv.usedBy?.username || null
    }));

    res.json({ invitations: formattedInvitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/profile/invitations - Create an invitation
 */
router.post('/invitations', jwtRequired, async (req, res) => {
  try {
    const { email, message } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await Invitation.create({
      token,
      inviter_id: req.userId,
      email: email || null,
      message: message || null,
      expires_at: expiresAt
    });

    res.status(201).json({
      invitation: invitation.get({ plain: true }),
      invite_url: `${req.protocol}://${req.get('host')}/register?token=${token}`
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id - Get user profile (public view)
 */
router.get('/:id', jwtRequired, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    const user = await User.findOne({
      where: { id: userId },
      attributes: ['id', 'username', 'bio', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalNotes = await Note.count({ where: { owner_id: userId } });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        created_at: user.created_at
      },
      stats: {
        total_notes: totalNotes || 0
      },
      is_own_profile: userId === req.userId
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
