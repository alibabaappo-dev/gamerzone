import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import { hashPassword, comparePassword, createToken, verifyToken } from './src/lib/auth';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'zahidffweb',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@zahidffweb.iam.gserviceaccount.com',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
};

if (!firebaseConfig.privateKey && process.env.NODE_ENV === 'production') {
  console.warn('Warning: FIREBASE_PRIVATE_KEY is not set in production environment');
}

if (!admin.apps.length && firebaseConfig.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Push Notification Route
app.post('/api/send-push', async (req, res) => {
    try {
      const { title, body, target, userId } = req.body;
      
      if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
      }

      if (!userId && !target) {
        return res.status(400).json({ error: 'Either userId or target must be specified' });
      }

      if (!admin.apps.length) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
          });
        } catch (e: any) {
          console.error('Firebase Admin initialization error in route:', e);
          return res.status(500).json({ error: 'Firebase Admin initialization failed: ' + (e.message || 'Unknown error') });
        }
      }

      // Fetch users from Firestore using Admin SDK
      let tokens: string[] = [];

      if (userId) {
        // Send to specific user
        console.log(`Sending push to specific user: ${userId}`);
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (userDoc.exists) {
          const user = userDoc.data();
          if (user?.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
            tokens = user.fcmTokens;
          } else {
            console.log(`User ${userId} has no FCM tokens`);
          }
        } else {
          console.log(`User ${userId} not found`);
        }
      } else {
        // Broadcast based on target
        console.log(`Broadcasting push to target: ${target}`);
        const usersSnap = await admin.firestore().collection('users').get();
        
        usersSnap.forEach(doc => {
          const user = doc.data();
          if (user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
            if (target === 'admins' && !user.isAdmin) return;
            if (target === 'active' && user.isBanned) return;
            tokens = tokens.concat(user.fcmTokens);
          }
        });
      }

      if (tokens.length === 0) {
        return res.status(404).json({ error: 'No valid FCM tokens found for the selected target.' });
      }

      // Remove duplicate tokens
      tokens = [...new Set(tokens)];
      console.log(`Sending to ${tokens.length} tokens`);

      if (tokens.length > 500) {
        console.warn('Warning: Too many tokens for one multicast message. Truncating to 500.');
        tokens = tokens.slice(0, 500);
      }

      const message: any = {
        notification: { 
          title, 
          body
        },
        tokens: tokens,
      };

      console.log('Sending FCM message payload:', JSON.stringify({ ...message, tokens: `[${tokens.length} tokens]` }));

      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('FCM Response:', JSON.stringify(response));
        
        // Clean up invalid tokens
        let cleanupCount = 0;
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error) {
              const errorCode = resp.error.code;
              if (errorCode === 'messaging/registration-token-not-registered' || 
                  errorCode === 'messaging/invalid-registration-token') {
                failedTokens.push(tokens[idx]);
              }
            }
          });

          if (failedTokens.length > 0) {
            console.log(`Removing ${failedTokens.length} invalid tokens...`);
            // 1. If we are sending to a specific user, we can just update that user doc
            if (userId) {
               await admin.firestore().collection('users').doc(userId).update({
                 fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
               });
               cleanupCount = failedTokens.length;
               console.log(`Removed ${cleanupCount} invalid tokens for user ${userId}`);
            } else {
               // 2. For broadcasts, we need to find which users have these tokens.
               // We process in chunks to avoid hitting Firestore limits if there are many.
               const cleanupPromises = failedTokens.map(async (token) => {
                 const usersWithToken = await admin.firestore().collection('users')
                   .where('fcmTokens', 'array-contains', token)
                   .get();
                 
                 if (!usersWithToken.empty) {
                   const batch = admin.firestore().batch();
                   usersWithToken.forEach(userDoc => {
                     batch.update(userDoc.ref, {
                       fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
                     });
                   });
                   await batch.commit();
                   return usersWithToken.size;
                 }
                 return 0;
               });
               
               const results = await Promise.all(cleanupPromises);
               cleanupCount = results.reduce((a, b) => a + b, 0);
               console.log(`Cleaned up ${cleanupCount} invalid tokens across all users`);
            }
          }
        }

        res.json({
          success: true,
          successCount: response.successCount,
          failureCount: response.failureCount,
          cleanupCount: cleanupCount,
          message: `Successfully sent ${response.successCount} messages. Failed: ${response.failureCount}. Cleaned up: ${cleanupCount} stale tokens.`,
          responses: response.responses 
        });
      } catch (fcmError: any) {
        console.error('FCM sendEachForMulticast threw an error:', fcmError);
        // Check for specific error codes
        if (fcmError.code === 'messaging/invalid-argument') {
             return res.status(400).json({ error: 'Invalid FCM argument: ' + fcmError.message });
        }
        throw fcmError; // Re-throw to be caught by outer catch
      }

    } catch (error: any) {
      console.error('Error sending push notification (Outer Catch):', error);
      
      let errorMessage = 'An unknown error occurred';
      let errorCode = 'UNKNOWN_ERROR';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Firebase errors that might be objects
        errorMessage = (error as any).message || JSON.stringify(error);
        errorCode = (error as any).code || errorCode;
      } else {
        errorMessage = String(error);
      }

      // Clean up the error message if it's a JSON string
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed && parsed.message) {
          errorMessage = parsed.message;
        }
      } catch (e) {
        // Not a JSON string, keep as is
      }

      res.status(500).json({ error: errorMessage, code: errorCode });
    }
  });

  // Auth routes
  app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    try {
      const usersRef = admin.firestore().collection('users');
      const existingUserQuery = await usersRef.where('username', '==', username).get();
      
      if (!existingUserQuery.empty) {
        return res.status(409).json({ message: 'Username already exists' });
      }

      const hashedPassword = await hashPassword(password);
      const newUserRef = await usersRef.add({
        username,
        email,
        password: hashedPassword,
        isAdmin: false,
        walletBalance: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const user = { id: newUserRef.id, username, isAdmin: false };
      const token = createToken(user);

      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      res.status(201).json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
      const usersRef = admin.firestore().collection('users');
      const userQuery = await usersRef.where('username', '==', username).get();
      
      if (userQuery.empty) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const userDoc = userQuery.docs[0];
      const user = userDoc.data();

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const userPayload = { id: userDoc.id, username: user.username, isAdmin: user.isAdmin };
      const token = createToken(userPayload);

      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      res.status(200).json(userPayload);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/logout', (req, res) => {
    res.clearCookie('token').json({ message: 'Logged out successfully' });
  });

  app.get('/api/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    res.json(decoded);
  });

  // Middleware to protect routes
  const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = decoded; // Add user payload to the request
    next();
  };

  // Tournament routes
  app.post('/api/tournaments', authenticate, async (req, res) => {
    const { name, description } = req.body;
    const creatorId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: 'Tournament name is required' });
    }

    try {
      const tournamentRef = await admin.firestore().collection('tournaments').add({
        name,
        description,
        creatorId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      const tournamentDoc = await tournamentRef.get();
      res.status(201).json({ id: tournamentDoc.id, ...tournamentDoc.data() });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/tournaments', async (req, res) => {
    try {
      const tournamentsSnap = await admin.firestore().collection('tournaments').get();
      const tournaments = tournamentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(tournaments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/tournaments/:id/participants', async (req, res) => {
    try {
      const participantsSnap = await admin.firestore().collection('participants')
        .where('tournamentId', '==', req.params.id)
        .get();
      
      const participantUserIds = participantsSnap.docs.map(doc => doc.data().userId);
      
      if (participantUserIds.length === 0) {
        return res.json([]);
      }

      // Fetch usernames for these IDs
      const usersSnap = await admin.firestore().collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', participantUserIds)
        .get();
      
      const participants = usersSnap.docs.map(doc => ({ username: doc.data().username }));
      res.json(participants);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/tournaments/:id/matches', async (req, res) => {
    try {
      const matchesSnap = await admin.firestore().collection('matches')
        .where('tournamentId', '==', req.params.id)
        .get();
      const matches = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(matches);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/tournaments/:id', async (req, res) => {
    try {
      const tournamentDoc = await admin.firestore().collection('tournaments').doc(req.params.id).get();
      if (!tournamentDoc.exists) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
      res.json({ id: tournamentDoc.id, ...tournamentDoc.data() });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Admin routes
  const adminOnly = async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is admin in local DB or hardcoded email
    if (req.user.isAdmin || req.user.email === 'alibabaappo@gmail.com') {
      return next();
    }

    // Check Firestore admin_emails collection
    try {
      if (admin.apps.length) {
        const adminEmailDoc = await admin.firestore().collection('admin_emails').doc(req.user.email).get();
        if (adminEmailDoc.exists) {
          return next();
        }
      }
    } catch (error) {
      console.error('Error checking admin status in Firestore:', error);
    }

    return res.status(403).json({ message: 'Forbidden' });
  };

  app.get('/api/admin/users', authenticate, adminOnly, async (req, res) => {
    try {
      const usersSnap = await admin.firestore().collection('users').get();
      const users = usersSnap.docs.map(doc => ({ id: doc.id, username: doc.data().username, isAdmin: doc.data().isAdmin }));
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/tournaments', authenticate, adminOnly, async (req, res) => {
    try {
      const tournamentsSnap = await admin.firestore().collection('tournaments').get();
      const tournaments = tournamentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(tournaments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/tournaments/:id/join', authenticate, async (req, res) => {
    const tournamentId = req.params.id;
    const userId = req.user.id;

    try {
      const participantsRef = admin.firestore().collection('participants');
      const existingParticipantQuery = await participantsRef
        .where('tournamentId', '==', tournamentId)
        .where('userId', '==', userId)
        .get();
      
      if (!existingParticipantQuery.empty) {
        return res.status(409).json({ message: 'Already joined this tournament' });
      }

      await participantsRef.add({ tournamentId, userId, joinedAt: admin.firestore.FieldValue.serverTimestamp() });
      res.status(201).json({ message: 'Successfully joined tournament' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/tournaments/:id/leave', authenticate, async (req, res) => {
    const tournamentId = req.params.id;
    const userId = req.user.id;

    try {
      const participantsRef = admin.firestore().collection('participants');
      const participantQuery = await participantsRef
        .where('tournamentId', '==', tournamentId)
        .where('userId', '==', userId)
        .get();
      
      if (!participantQuery.empty) {
        const batch = admin.firestore().batch();
        participantQuery.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      
      res.json({ message: 'Successfully left tournament' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/tournaments/:id/start', authenticate, async (req, res) => {
    const tournamentId = req.params.id;
    
    try {
      const tournamentDoc = await admin.firestore().collection('tournaments').doc(tournamentId).get();
      if (!tournamentDoc.exists) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
      
      const tournament = tournamentDoc.data();
      if (tournament?.creatorId !== req.user.id) {
        return res.status(403).json({ message: 'Only the creator can start the tournament' });
      }

      const participantsSnap = await admin.firestore().collection('participants')
        .where('tournamentId', '==', tournamentId)
        .get();
      
      const participants = participantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (participants.length < 2) {
        return res.status(400).json({ message: 'Not enough participants to start' });
      }

      // Simple single-elimination bracket generation
      const batch = admin.firestore().batch();
      let round = 1;
      let matchNumber = 1;
      for (let i = 0; i < participants.length; i += 2) {
        const p1 = participants[i];
        const p2 = i + 1 < participants.length ? participants[i+1] : null;
        const matchRef = admin.firestore().collection('matches').doc();
        batch.set(matchRef, {
          tournamentId,
          round,
          matchNumber: matchNumber++,
          participant1Id: p1.id,
          participant2Id: p2 ? p2.id : null,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      batch.update(tournamentDoc.ref, { status: 'active' });
      await batch.commit();
      
      res.json({ message: 'Tournament started and first round generated' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/stats', authenticate, async (req, res) => {
    const userId = req.user.id;
    try {
      const matchesSnap = await admin.firestore().collection('matches')
        .where('winnerId', '==', userId)
        .get();
      const wins = matchesSnap.size;

      const participantsSnap = await admin.firestore().collection('participants')
        .where('userId', '==', userId)
        .get();
      
      const tournamentIds = participantsSnap.docs.map(doc => doc.data().tournamentId);
      
      let activeCount = 0;
      if (tournamentIds.length > 0) {
        const tournamentsSnap = await admin.firestore().collection('tournaments')
          .where(admin.firestore.FieldPath.documentId(), 'in', tournamentIds)
          .where('status', '==', 'active')
          .get();
        activeCount = tournamentsSnap.size;
      }
      
      res.json({ wins, activeTournaments: activeCount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Forgot Password - Send 4-digit code
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      // Check if user exists in Firebase Auth
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (e) {
        return res.status(404).json({ error: 'No user found with this email address' });
      }

      // Generate 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

      // Store in Firestore
      await admin.firestore().collection('password_resets').doc(email).set({
        email,
        code,
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Send Email
      const nodemailer = await import('nodemailer');
      
      // Use service: 'gmail' for better reliability with Gmail
      const transporterConfig: any = {
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };

      if (process.env.EMAIL_HOST?.includes('gmail')) {
        transporterConfig.service = 'gmail';
      } else {
        transporterConfig.host = process.env.EMAIL_HOST || 'smtp.gmail.com';
        transporterConfig.port = parseInt(process.env.EMAIL_PORT || '465');
        transporterConfig.secure = process.env.EMAIL_SECURE === 'true';
        // Add TLS options to handle potential socket issues
        transporterConfig.tls = {
          rejectUnauthorized: false
        };
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      const mailOptions = {
        from: `"Gamer Zone" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Code - Gamer Zone',
        text: `Your password reset code is: ${code}. It will expire in 15 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Password Reset</h2>
            <p>You requested to reset your password for your Gamer Zone account.</p>
            <p>Your 4-digit verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1D4ED8; margin: 20px 0;">
              ${code}
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Reset code sent to your email' });
    } catch (error: any) {
      console.error('Forgot Password Error:', error);
      res.status(500).json({ error: 'Failed to send reset code: ' + error.message });
    }
  });

  // Verify Reset Code
  app.post('/api/auth/verify-code', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    try {
      const resetDoc = await admin.firestore().collection('password_resets').doc(email).get();
      if (!resetDoc.exists) {
        return res.status(400).json({ error: 'No reset request found for this email' });
      }

      const data = resetDoc.data();
      if (data?.code !== code) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      if (Date.now() > data?.expiresAt) {
        return res.status(400).json({ error: 'Verification code has expired' });
      }

      res.json({ success: true, message: 'Code verified successfully' });
    } catch (error: any) {
      console.error('Verify Code Error:', error);
      res.status(500).json({ error: 'Failed to verify code' });
    }
  });

  // Send Verification OTP
  app.post('/api/auth/send-verification-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      // Generate 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

      // Store in Firestore
      await admin.firestore().collection('email_verifications').doc(email).set({
        email,
        code,
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Send Email
      const nodemailer = await import('nodemailer');
      
      const transporterConfig: any = {
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 30000,   // 30 seconds
        socketTimeout: 30000,     // 30 seconds
      };
      console.log('SMTP Auth User:', process.env.EMAIL_USER ? 'Set' : 'Missing');
      console.log('SMTP Auth Pass:', process.env.EMAIL_PASS ? 'Set' : 'Missing');

      if (process.env.EMAIL_HOST?.includes('gmail')) {
        transporterConfig.service = 'gmail';
      } else {
        transporterConfig.host = process.env.EMAIL_HOST || 'smtp.gmail.com';
        const port = parseInt(process.env.EMAIL_PORT || '465');
        transporterConfig.port = port;
        // Default secure to true for port 465, false for others unless explicitly set
        transporterConfig.secure = process.env.EMAIL_SECURE === 'true' || (port === 465);
        transporterConfig.tls = { rejectUnauthorized: false };
      }

      const transporter = nodemailer.createTransport(transporterConfig);
      
      // Verify connection
      await transporter.verify();

      const mailOptions = {
        from: `"Gamer Zone" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Email Verification Code - Gamer Zone',
        text: `Your verification code is: ${code}. It will expire in 15 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Email Verification</h2>
            <p>Your 4-digit verification code for Gamer Zone is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1D4ED8; margin: 20px 0;">
              ${code}
            </div>
            <p>This code will expire in 15 minutes.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Verification code sent to your email' });
    } catch (error: any) {
      console.error('Send Verification OTP Error:', error);
      res.status(500).json({ error: 'Failed to send verification code: ' + error.message });
    }
  });

  // Verify OTP
  app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    try {
      const verifyDoc = await admin.firestore().collection('email_verifications').doc(email).get();
      if (!verifyDoc.exists) {
        return res.status(400).json({ error: 'No verification request found for this email' });
      }

      const data = verifyDoc.data();
      if (data?.code !== code) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      if (Date.now() > data?.expiresAt) {
        return res.status(400).json({ error: 'Verification code has expired' });
      }

      // Mark as verified
      await admin.firestore().collection('email_verifications').doc(email).delete();
      
      res.json({ success: true, message: 'OTP verified successfully' });
    } catch (error: any) {
      console.error('Verify OTP Error:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });

  // Reset Password
  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    try {
      // Re-verify code
      const resetDoc = await admin.firestore().collection('password_resets').doc(email).get();
      if (!resetDoc.exists || resetDoc.data()?.code !== code || Date.now() > resetDoc.data()?.expiresAt) {
        return res.status(400).json({ error: 'Invalid or expired verification session' });
      }

      // Update password in Firebase Auth
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword
      });

      // Delete reset record
      await admin.firestore().collection('password_resets').doc(email).delete();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('Reset Password Error:', error);
      res.status(500).json({ error: 'Failed to reset password: ' + error.message });
    }
  });

  // Other API routes will go here

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Start listening if not in Netlify or in development
  if (process.env.NODE_ENV !== 'production' || !process.env.NETLIFY) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export { app };
