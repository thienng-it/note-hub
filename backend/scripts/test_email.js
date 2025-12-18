#!/usr/bin/env node
/**
 * Manual test script for email service.
 * Tests email sending in development mode (without Mailjet configured).
 *
 * Usage:
 *   node backend/scripts/test_email.js
 */

import emailService from '../src/services/emailService.js';

async function testEmailService() {
  console.log('='.repeat(60));
  console.log('Email Service Test');
  console.log('='.repeat(60));
  console.log();

  // Test 1: Check if service is enabled
  console.log('Test 1: Check Email Service Status');
  console.log('-'.repeat(60));
  const isEnabled = emailService.isEnabled();
  console.log(`Email service enabled: ${isEnabled}`);
  if (!isEnabled) {
    console.log('✓ Running in development mode (emails will be logged to console)');
  } else {
    console.log('✓ Mailjet is configured (emails will be sent via API)');
  }
  console.log();

  // Test 2: Send password reset email
  console.log('Test 2: Send Password Reset Email');
  console.log('-'.repeat(60));
  try {
    const result = await emailService.sendPasswordResetEmail(
      'testuser@example.com',
      'testuser',
      'test-reset-token-abc123',
    );

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✓ Password reset email sent successfully!');
    } else {
      console.log('✗ Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('✗ Error sending email:', error.message);
  }
  console.log();

  // Test 3: Send generic email
  console.log('Test 3: Send Generic Email');
  console.log('-'.repeat(60));
  try {
    const result = await emailService.sendEmail({
      to: 'admin@example.com',
      subject: 'Test Email from NoteHub',
      textContent: 'This is a test email from NoteHub email service.',
      htmlContent: '<p>This is a <strong>test email</strong> from NoteHub email service.</p>',
    });

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✓ Generic email sent successfully!');
    } else {
      console.log('✗ Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('✗ Error sending email:', error.message);
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('Email Service Test Complete');
  console.log('='.repeat(60));
  console.log();
  console.log('Next Steps:');
  console.log('1. To enable Mailjet in production, set these environment variables:');
  console.log('   - MAILJET_API_KEY=your-api-key');
  console.log('   - MAILJET_SECRET_KEY=your-secret-key');
  console.log('   - MAILJET_SENDER_EMAIL=noreply@yourdomain.com');
  console.log('   - MAILJET_SENDER_NAME=NoteHub (optional)');
  console.log();
  console.log('2. See docs/guides/MAILJET_SETUP.md for detailed setup instructions');
  console.log();
}

// Run the test
testEmailService()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
